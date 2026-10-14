package com.sweethome.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.Room;

/**
 * Kiểm tra gia hạn tại phòng: phí theo giờ/ngày, giới hạn cách đơn kế tiếp 1 tiếng, ghi phí và thu
 * ngay, chỉ đơn đang ở.
 */
@ExtendWith(MockitoExtension.class)
class OrderExtensionServiceTest {

	private static final LocalDateTime CHECK_OUT = LocalDateTime.of(2026, 10, 8, 12, 0);

	@Mock
	private RentalOrderRepository orderRepository;

	private OrderExtensionService service;
	private Room room;
	private RentalOrder order;

	@BeforeEach
	void setUp() {
		service = new OrderExtensionService(orderRepository);
		room = OrderTestFactory.room(10L, "201", OrderTestFactory.roomType(1L, "A", 150000, 60000, 350000, 650000), 2);
		order = order(1L, "Hoàng Yến", CHECK_OUT.minusDays(2).withHour(14), CHECK_OUT);
		order.setStatus(OrderStatus.CHECKED_IN);
		order.setExtraHourPriceSnapshot(60000);
		order.setDailyPriceSnapshot(650000);
		order.setTotalAmount(1300000);
		order.setDeposit(300000);
		lenient().when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
		lenient().when(orderRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		lenient().when(orderRepository.findStaysStartingFrom(eq(10L), eq(1L), eq(CHECK_OUT), any())).thenReturn(List.of());
	}

	@Test
	void previewHourWithoutNextOrderIsUnlimited() {
		var preview = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 2, false, null));

		assertThat(preview.newCheckOutAt()).isEqualTo(CHECK_OUT.plusHours(2));
		assertThat(preview.fee()).isEqualTo(120000);
		assertThat(preview.hourPrice()).isEqualTo(60000);
		assertThat(preview.dayPrice()).isEqualTo(650000);
		assertThat(preview.nextOrder()).isNull();
		assertThat(preview.maxCheckOutAt()).isNull();
		assertThat(preview.available()).isTrue();
	}

	@Test
	void previewKeepsOneHourBeforeNextOrder() {
		nextOrderAt(CHECK_OUT.plusHours(2));

		var oneHour = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null));
		var oneDay = service.preview(1L, new ExtendRequest(ExtendType.DAY, 1, false, null));

		assertThat(oneHour.available()).isTrue();
		assertThat(oneHour.maxCheckOutAt()).isEqualTo(CHECK_OUT.plusHours(1));
		assertThat(oneHour.maxExtraHours()).isEqualTo(1);
		assertThat(oneHour.nextOrder().code()).isEqualTo("SH-1002");
		assertThat(oneDay.available()).isFalse();
		assertThat(oneDay.fee()).isEqualTo(650000);
	}

	@Test
	void nextOrderRightAfterLeavesNoExtraHours() {
		nextOrderAt(CHECK_OUT);

		var preview = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null));

		assertThat(preview.maxExtraHours()).isZero();
		assertThat(preview.available()).isFalse();
	}

	@Test
	void extendMovesCheckOutAddsFeeAndCollectsNow() {
		order.setStatus(OrderStatus.OVERSTAY);

		var dto = service.extend(1L, new ExtendRequest(ExtendType.HOUR, 2, true, PaymentMethod.CASH));

		assertThat(dto.checkOutAt()).isEqualTo(CHECK_OUT.plusHours(2));
		assertThat(order.getStays().getLast().getEndAt()).isEqualTo(CHECK_OUT.plusHours(2));
		assertThat(dto.status()).isEqualTo(OrderStatus.CHECKED_IN);
		assertThat(dto.surcharges()).extracting(OrderSurchargeDto::name).containsExactly("Gia hạn +2 giờ");
		assertThat(dto.totalAmount()).isEqualTo(1420000);
		assertThat(order.getPayments()).singleElement().satisfies(p -> {
			assertThat(p.getAmount()).isEqualTo(120000);
			assertThat(p.getMethod()).isEqualTo(PaymentMethod.CASH);
		});
	}

	@Test
	void extendDayAddedToCheckoutLaterHasNoPayment() {
		var dto = service.extend(1L, new ExtendRequest(ExtendType.DAY, 1, false, null));

		assertThat(dto.checkOutAt()).isEqualTo(CHECK_OUT.plusDays(1));
		assertThat(dto.surcharges()).extracting(OrderSurchargeDto::name).containsExactly("Gia hạn +1 ngày");
		assertThat(order.getPayments()).isEmpty();
		assertThat(dto.dueAmount()).isEqualTo(1300000 + 650000 - 300000);
	}

	@Test
	void extendRejectsWhenClashingNextOrder() {
		nextOrderAt(CHECK_OUT.plusHours(2));

		assertThatThrownBy(() -> service.extend(1L, new ExtendRequest(ExtendType.HOUR, 2, false, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("SH-1002");
	}

	@Test
	void extendNowRequiresPaymentMethod() {
		assertThatThrownBy(() -> service.extend(1L, new ExtendRequest(ExtendType.HOUR, 1, true, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("hình thức");
	}

	@Test
	void onlyStayingOrderCanBeExtended() {
		order.setStatus(OrderStatus.BOOKED);

		assertThatThrownBy(() -> service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("đang ở");
	}

	/** Phòng có đơn khác (id 2) nhận phòng lúc {@code checkInAt}. */
	private void nextOrderAt(LocalDateTime checkInAt) {
		RentalOrder next = order(2L, "Lý Gia Bảo", checkInAt, checkInAt.plusHours(3));
		when(orderRepository.findStaysStartingFrom(eq(10L), eq(1L), eq(CHECK_OUT), any())).thenReturn(next.getStays());
	}

	private RentalOrder order(long id, String guestName, LocalDateTime checkInAt, LocalDateTime checkOutAt) {
		RentalOrder o = new RentalOrder();
		o.scheduleSingleStay(room, checkInAt, checkOutAt);
		o.setGuestName(guestName);
		o.setRentalType(RentalType.DAILY);
		o.setCheckInMode(com.sweethome.room.CheckInMode.STAFF);
		o.setSource(OrderSource.ZALO);
		o.setRoomTypeNameSnapshot("A");
		try {
			var field = RentalOrder.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(o, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return o;
	}
}
