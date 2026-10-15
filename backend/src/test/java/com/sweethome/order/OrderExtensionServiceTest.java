package com.sweethome.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

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
import com.sweethome.room.Room;
import com.sweethome.room.RoomRepository;
import com.sweethome.activity.ActivityAction;
import com.sweethome.activity.ActivityLogService;

/**
 * Kiểm tra gia hạn tại phòng: phí theo giờ/ngày, giới hạn cách đơn kế tiếp 1 tiếng, ghi phí và thu
 * ngay, chỉ đơn đang ở.
 */
@ExtendWith(MockitoExtension.class)
class OrderExtensionServiceTest {

	@Mock
	private ActivityLogService activityLog;

	private static final LocalDateTime CHECK_OUT = LocalDateTime.of(2026, 10, 8, 12, 0);
	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

	@Mock
	private RentalOrderRepository orderRepository;
	@Mock
	private RoomRepository roomRepository;

	private OrderExtensionService service;
	private Room room;
	private RentalOrder order;

	@BeforeEach
	void setUp() {
		service = new OrderExtensionService(orderRepository, roomRepository,
				Clock.fixed(LocalDateTime.of(2026, 10, 8, 12, 30).atZone(ZONE).toInstant(), ZONE), activityLog);
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
		var preview = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 2, false, null, null));

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

		var oneHour = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null, null));
		var oneDay = service.preview(1L, new ExtendRequest(ExtendType.DAY, 1, false, null, null));

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

		var preview = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null, null));

		assertThat(preview.maxExtraHours()).isZero();
		assertThat(preview.available()).isFalse();
	}

	@Test
	void extendMovesCheckOutAddsFeeAndCollectsNow() {
		order.setStatus(OrderStatus.OVERSTAY);

		var dto = service.extend(1L, new ExtendRequest(ExtendType.HOUR, 2, true, PaymentMethod.CASH, null));

		assertThat(dto.checkOutAt()).isEqualTo(CHECK_OUT.plusHours(2));
		assertThat(order.getStays().getLast().getEndAt()).isEqualTo(CHECK_OUT.plusHours(2));
		assertThat(dto.status()).isEqualTo(OrderStatus.CHECKED_IN);
		assertThat(dto.surcharges()).extracting(OrderSurchargeDto::name).containsExactly("Gia hạn +2 giờ");
		assertThat(dto.totalAmount()).isEqualTo(1420000);
		assertThat(order.getPayments()).singleElement().satisfies(p -> {
			assertThat(p.getAmount()).isEqualTo(120000);
			assertThat(p.getMethod()).isEqualTo(PaymentMethod.CASH);
		});
		verify(activityLog).log(ActivityAction.ORDER_EXTENDED, 1L, "201", "Gia hạn +2 giờ, thu 120.000đ tiền mặt");
	}

	@Test
	void extendDayAddedToCheckoutLaterHasNoPayment() {
		var dto = service.extend(1L, new ExtendRequest(ExtendType.DAY, 1, false, null, null));

		assertThat(dto.checkOutAt()).isEqualTo(CHECK_OUT.plusDays(1));
		assertThat(dto.surcharges()).extracting(OrderSurchargeDto::name).containsExactly("Gia hạn +1 ngày");
		assertThat(order.getPayments()).isEmpty();
		assertThat(dto.dueAmount()).isEqualTo(1300000 + 650000 - 300000);
	}

	@Test
	void extendRejectsWhenClashingNextOrder() {
		nextOrderAt(CHECK_OUT.plusHours(2));

		assertThatThrownBy(() -> service.extend(1L, new ExtendRequest(ExtendType.HOUR, 2, false, null, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("SH-1002");
	}

	@Test
	void extendNowRequiresPaymentMethod() {
		assertThatThrownBy(() -> service.extend(1L, new ExtendRequest(ExtendType.HOUR, 1, true, null, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("hình thức");
	}

	@Test
	void onlyStayingOrderCanBeExtended() {
		order.setStatus(OrderStatus.BOOKED);

		assertThatThrownBy(() -> service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null, null)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("đang ở");
	}

	@Test
	void moveOptionsOnlySamePriceCleanAcceptingAndFreeRooms() {
		nextOrderAt(CHECK_OUT.plusHours(2));
		Room free = otherRoom(11L, "202");
		Room dirty = otherRoom(12L, "203");
		dirty.setNeedsCleaning(true);
		Room pricier = OrderTestFactory.room(13L, "204", OrderTestFactory.roomType(2L, "B", 150000, 60000, 350000, 700000), 2);
		Room closed = otherRoom(14L, "205");
		closed.setAcceptingBookings(false);
		Room busy = otherRoom(15L, "206");
		when(roomRepository.findAll()).thenReturn(List.of(room, busy, pricier, dirty, closed, free));
		when(orderRepository.findOverlapping(eq(15L), any(), any())).thenReturn(List.of(new RentalOrder()));
		RentalOrder later = order(3L, "Khách sau", CHECK_OUT.plusDays(1).plusHours(7), CHECK_OUT.plusDays(2));
		when(orderRepository.findStaysStartingFrom(eq(11L), eq(1L), eq(CHECK_OUT), any())).thenReturn(later.getStays());

		var preview = service.preview(1L, new ExtendRequest(ExtendType.DAY, 1, false, null, null));

		assertThat(preview.available()).isFalse();
		assertThat(preview.moveOptions()).singleElement().satisfies(o -> {
			assertThat(o.roomNumber()).isEqualTo("202");
			assertThat(o.freeUntil()).isEqualTo(CHECK_OUT.plusDays(1).plusHours(7));
		});
	}

	@Test
	void availableInPlaceHasNoMoveOptions() {
		var preview = service.preview(1L, new ExtendRequest(ExtendType.HOUR, 1, false, null, null));

		assertThat(preview.moveOptions()).isEmpty();
	}

	@Test
	void extendWithMoveAddsStayOnNewRoom() {
		nextOrderAt(CHECK_OUT.plusHours(2));
		Room target = otherRoom(11L, "202");
		when(roomRepository.findAll()).thenReturn(List.of(room, target));
		when(roomRepository.getReferenceById(11L)).thenReturn(target);

		var dto = service.extend(1L, new ExtendRequest(ExtendType.DAY, 1, false, null, 11L));

		assertThat(dto.roomNumber()).isEqualTo("202");
		assertThat(dto.checkOutAt()).isEqualTo(CHECK_OUT.plusDays(1));
		assertThat(dto.stays()).extracting(OrderDto.Stay::roomNumber).containsExactly("201", "202");
		assertThat(order.getStays().getFirst().getEndAt()).isEqualTo(CHECK_OUT);
		assertThat(order.getStays().getLast().getStartAt()).isEqualTo(CHECK_OUT);
		verify(activityLog).log(ActivityAction.ORDER_EXTENDED, 1L, "202", "Gia hạn +1 ngày, chuyển sang phòng 202");
		assertThat(dto.surcharges()).extracting(OrderSurchargeDto::name).containsExactly("Gia hạn +1 ngày");
	}

	@Test
	void extendRejectsMoveToRoomNotInOptions() {
		nextOrderAt(CHECK_OUT.plusHours(2));
		Room dirty = otherRoom(11L, "202");
		dirty.setNeedsCleaning(true);
		when(roomRepository.findAll()).thenReturn(List.of(room, dirty));

		assertThatThrownBy(() -> service.extend(1L, new ExtendRequest(ExtendType.DAY, 1, false, null, 11L)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("không chuyển sang được");
	}

	@Test
	void releaseMovedOutRoomsMarksOldRoomForCleaningOnce() {
		Room target = otherRoom(11L, "202");
		order.moveTo(target, CHECK_OUT.plusDays(1));
		OrderStay oldStay = order.getStays().getFirst();
		when(orderRepository.findMovedOutStaysToRelease(LocalDateTime.of(2026, 10, 8, 12, 30))).thenReturn(List.of(oldStay));

		assertThat(service.releaseMovedOutRooms()).isEqualTo(1);
		assertThat(room.isNeedsCleaning()).isTrue();
		assertThat(target.isNeedsCleaning()).isFalse();
		assertThat(oldStay.isCleaningRequested()).isTrue();
	}

	/** Phòng khác cùng hạng (cùng giá) với phòng đang ở. */
	private Room otherRoom(long id, String number) {
		return OrderTestFactory.room(id, number, room.getRoomType(), 2);
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
