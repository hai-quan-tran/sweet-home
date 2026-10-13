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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;

/**
 * Kiểm tra nhận phòng và tự chuyển trạng thái theo giờ cho 2 hình thức check-in.
 */
@ExtendWith(MockitoExtension.class)
class OrderLifecycleServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 7, 16, 0);

	@Mock
	private RentalOrderRepository orderRepository;

	private OrderLifecycleService service;

	@BeforeEach
	void setUp() {
		Clock clock = Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE);
		service = new OrderLifecycleService(orderRepository, clock);
		lenient().when(orderRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
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
