package com.sweethome.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;
import com.sweethome.surcharge.Surcharge;
import com.sweethome.surcharge.SurchargeCalculator;
import com.sweethome.surcharge.SurchargeRepository;
import com.sweethome.surcharge.SurchargeWhenType;

/**
 * Kiểm tra nhận phòng, tự chuyển trạng thái theo giờ cho 2 hình thức check-in, và trả phòng.
 */
@ExtendWith(MockitoExtension.class)
class OrderLifecycleServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 7, 16, 0);

	@Mock
	private RentalOrderRepository orderRepository;
	@Mock
	private SurchargeRepository surchargeRepository;

	private OrderLifecycleService service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE);
		service = new OrderLifecycleService(orderRepository, surchargeRepository, new SurchargeCalculator(), clock);
		lenient().when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
		lenient().when(orderRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	@Test
	void checkInSetsStatusAndActualTimeToNow() {
		RentalOrder order = order(CheckInMode.STAFF, OrderStatus.BOOKED, 15, 18);
		when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

		var dto = service.checkIn(1L);

		assertThat(dto.status()).isEqualTo(OrderStatus.CHECKED_IN);
		assertThat(dto.actualCheckInAt()).isEqualTo(NOW);
	}

	@Test
	void checkInRejectsNonBookedOrder() {
		RentalOrder order = order(CheckInMode.STAFF, OrderStatus.CHECKED_IN, 15, 18);
		when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

		assertThatThrownBy(() -> service.checkIn(1L)).isInstanceOf(BusinessException.class);
	}

	@Test
	void checkInRejectsMissingOrder() {
		when(orderRepository.findById(1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.checkIn(1L)).isInstanceOf(BusinessException.class);
	}

	@Test
	void selfCheckInBecomesCheckedInAtScheduledTime() {
		RentalOrder order = order(CheckInMode.SELF, OrderStatus.BOOKED, 15, 18);

		assertThat(OrderLifecycleService.advance(order, NOW)).isTrue();
		assertThat(order.getStatus()).isEqualTo(OrderStatus.CHECKED_IN);
		assertThat(order.getActualCheckInAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 15, 0));
	}

	@Test
	void selfCheckInPastCheckOutGoesStraightToPendingCheckout() {
		RentalOrder order = order(CheckInMode.SELF, OrderStatus.BOOKED, 12, 16);

		OrderLifecycleService.advance(order, NOW);

		assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING_CHECKOUT);
	}

	@Test
	void staffBookedOrderStaysBookedAfterCheckInTime() {
		RentalOrder order = order(CheckInMode.STAFF, OrderStatus.BOOKED, 15, 18);

		assertThat(OrderLifecycleService.advance(order, NOW)).isFalse();
		assertThat(order.getStatus()).isEqualTo(OrderStatus.BOOKED);
	}

	@Test
	void staffCheckedInBecomesOverstayAfterCheckOutTime() {
		RentalOrder order = order(CheckInMode.STAFF, OrderStatus.CHECKED_IN, 12, 16);

		OrderLifecycleService.advance(order, NOW);

		assertThat(order.getStatus()).isEqualTo(OrderStatus.OVERSTAY);
	}

	@Test
	void checkedInBeforeCheckOutTimeIsUnchanged() {
		RentalOrder order = order(CheckInMode.SELF, OrderStatus.CHECKED_IN, 15, 18);

		assertThat(OrderLifecycleService.advance(order, NOW)).isFalse();
	}

	@Test
	void advanceStatusesCountsChangedOrders() {
		when(orderRepository.findDueForAutoTransition(NOW)).thenReturn(List.of(
				order(CheckInMode.SELF, OrderStatus.BOOKED, 15, 18),
				order(CheckInMode.STAFF, OrderStatus.CHECKED_IN, 12, 16)));

		assertThat(service.advanceStatuses()).isEqualTo(2);
	}

	@Test
	void checkoutLateAddsRoundedUpOverstayCollectsDueAndMarksRoomForCleaning() {
		RentalOrder order = stayingOrder(OrderStatus.OVERSTAY);
		when(surchargeRepository.findActiveByRoomTypeId(1L)).thenReturn(List.of(overstaySurcharge()));

		// trả 17:20, hẹn 16:00 → trễ 80 phút > ân hạn 15 → 2 giờ x 50.000
		var dto = service.checkout(1L, request(17, 20, Set.of(), PaymentMethod.CASH));

		assertThat(dto.status()).isEqualTo(OrderStatus.CHECKED_OUT);
		assertThat(dto.actualCheckOutAt()).isEqualTo(LocalDateTime.of(2026, 10, 7, 17, 20));
		assertThat(dto.surcharges()).extracting(OrderSurchargeDto::amount).containsExactly(100000L);
		assertThat(dto.totalAmount()).isEqualTo(300000);
		assertThat(dto.payments()).hasSize(1);
		assertThat(dto.payments().get(0).amount()).isEqualTo(250000);
		assertThat(dto.dueAmount()).isZero();
		assertThat(order.getRoom().isNeedsCleaning()).isTrue();
	}

	@Test
	void checkoutEarlyDoesNotReducePriceAndSkipsPaymentWhenFullyPaid() {
		RentalOrder order = stayingOrder(OrderStatus.CHECKED_IN);
		order.setDeposit(200000);
		when(surchargeRepository.findActiveByRoomTypeId(1L)).thenReturn(List.of(overstaySurcharge()));

		var dto = service.checkout(1L, request(14, 0, null, null));

		assertThat(dto.totalAmount()).isEqualTo(200000);
		assertThat(dto.surcharges()).isEmpty();
		assertThat(dto.payments()).isEmpty();
	}

	@Test
	void previewIncludesChosenManualSurchargeAndListsOptions() {
		stayingOrder(OrderStatus.PENDING_CHECKOUT);
		Surcharge manual = surcharge(5L, "Dọn thêm", SurchargeWhenType.MANUAL, 30000L);
		when(surchargeRepository.findActiveByRoomTypeId(1L)).thenReturn(List.of(overstaySurcharge(), manual));

		var preview = service.previewCheckout(1L, request(16, 0, Set.of(5L), null));

		assertThat(preview.newSurcharges()).extracting(OrderSurchargeDto::name).containsExactly("Dọn thêm");
		assertThat(preview.totalAmount()).isEqualTo(230000);
		assertThat(preview.dueAmount()).isEqualTo(180000);
		assertThat(preview.manualOptions()).extracting(CheckoutPreviewResponse.ManualSurchargeOption::id).containsExactly(5L);
	}

	@Test
	void checkoutRequiresPaymentMethodWhenDue() {
		stayingOrder(OrderStatus.CHECKED_IN);

		assertThatThrownBy(() -> service.checkout(1L, request(16, 0, null, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("hình thức");
	}

	@Test
	void checkoutRejectsCheckOutNotAfterCheckIn() {
		stayingOrder(OrderStatus.CHECKED_IN);

		assertThatThrownBy(() -> service.checkout(1L, request(12, 0, null, PaymentMethod.CASH)))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void checkoutRejectsOrderNotStaying() {
		stayingOrder(OrderStatus.BOOKED);

		assertThatThrownBy(() -> service.previewCheckout(1L, request(16, 0, null, PaymentMethod.CASH)))
				.isInstanceOf(BusinessException.class);
	}

	/** Đơn 12:00 → 16:00, tổng 200.000, cọc 50.000. */
	private RentalOrder stayingOrder(OrderStatus status) {
		RentalOrder order = order(CheckInMode.STAFF, status, 12, 16);
		order.setTotalAmount(200000);
		order.setDeposit(50000);
		order.setExtraHourPriceSnapshot(50000);
		when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
		return order;
	}

	private CheckoutRequest request(int outHour, int outMinute, Set<Long> manualIds, PaymentMethod method) {
		return new CheckoutRequest(LocalDateTime.of(2026, 10, 7, 12, 0), LocalDateTime.of(2026, 10, 7, outHour, outMinute),
				manualIds, method);
	}

	private Surcharge overstaySurcharge() {
		Surcharge s = surcharge(4L, "Quá giờ", SurchargeWhenType.OVERSTAY, null);
		s.setGraceMinutes(15);
		return s;
	}

	private Surcharge surcharge(long id, String name, SurchargeWhenType type, Long amount) {
		Surcharge s = new Surcharge();
		s.setName(name);
		s.setWhenType(type);
		s.setAmount(amount);
		try {
			var field = Surcharge.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(s, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return s;
	}

	private RentalOrder order(CheckInMode mode, OrderStatus status, int checkInHour, int checkOutHour) {
		RentalOrder order = new RentalOrder();
		order.setRoom(OrderTestFactory.room(10L, "101", OrderTestFactory.roomType(1L, "A", 1, 1, 1, 1), 2));
		order.setRentalType(RentalType.HOURLY);
		order.setCheckInMode(mode);
		order.setStatus(status);
		order.setCheckInAt(LocalDateTime.of(2026, 10, 7, checkInHour, 0));
		order.setCheckOutAt(LocalDateTime.of(2026, 10, 7, checkOutHour, 0));
		try {
			var field = RentalOrder.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(order, 1L);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return order;
	}
}
