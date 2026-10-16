package com.sweethome.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.activity.ActivityAction;
import com.sweethome.activity.ActivityLogRepository;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountStatus;
import com.sweethome.dashboard.DashboardDto.RoomState;
import com.sweethome.dashboard.DashboardDto.TaskKind;
import com.sweethome.order.OrderPayment;
import com.sweethome.order.OrderStatus;
import com.sweethome.order.OrderStay;
import com.sweethome.order.RentalOrder;
import com.sweethome.order.RentalOrderRepository;
import com.sweethome.order.RentalType;
import com.sweethome.room.CheckInMode;
import com.sweethome.room.Room;
import com.sweethome.room.RoomRepository;
import com.sweethome.schedule.WorkShift;
import com.sweethome.schedule.WorkShiftRepository;

/**
 * Kiểm tra số liệu Tổng quan: tình trạng phòng theo đơn đang ở / Chờ dọn / khách kế tiếp, việc cần làm hôm nay,
 * doanh thu theo ngày nhận phòng (đơn huỷ tính cọc giữ lại, Nhân viên không có), cơ cấu đơn tháng, công suất.
 */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDate TODAY = LocalDate.of(2026, 10, 7);
	private static final LocalDateTime NOW = TODAY.atTime(12, 40);

	@Mock
	private RentalOrderRepository orderRepository;
	@Mock
	private RoomRepository roomRepository;
	@Mock
	private WorkShiftRepository shiftRepository;
	@Mock
	private AccountRepository accountRepository;
	@Mock
	private ActivityLogRepository activityLogRepository;

	private DashboardService service;
	private Room r101;
	private Room r102;
	private Room r202;
	private Room r301;
	private Room r302;

	@BeforeEach
	void setUp() {
		service = new DashboardService(orderRepository, roomRepository, shiftRepository, accountRepository,
				activityLogRepository, Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE));
		r101 = room(1L, "101");
		r102 = room(2L, "102");
		r202 = room(3L, "202");
		r101.setNeedsCleaning(true);
		r301 = room(4L, "301");
		r302 = room(5L, "302");
		r302.setAcceptingBookings(false);
	}

	@Test
	void overviewForManager() {
		Account hong = account(5L, "Lê Thị Hồng", AccountStatus.ACTIVE);
		Account locked = account(6L, "Đã khoá", AccountStatus.LOCKED);
		when(accountRepository.findAll()).thenReturn(List.of(hong, locked));
		when(shiftRepository.findOverlapping(TODAY.atStartOfDay(), TODAY.plusDays(1).atStartOfDay()))
				.thenReturn(List.of(shift(5L, "Sáng", TODAY.atTime(6, 0), TODAY.atTime(14, 0)),
						shift(6L, "Chiều", TODAY.atTime(12, 0), TODAY.atTime(22, 0))));

		RentalOrder staying = order(10L, r102, OrderStatus.CHECKED_IN, CheckInMode.STAFF, TODAY.atTime(9, 30), TODAY.atTime(13, 30), 300_000, 150_000);
		RentalOrder overstay = order(11L, r202, OrderStatus.OVERSTAY, CheckInMode.STAFF, TODAY.atTime(10, 0), TODAY.atTime(12, 15), 200_000, 200_000);
		RentalOrder pending = order(12L, r302, OrderStatus.PENDING_CHECKOUT, CheckInMode.SELF, TODAY.atTime(6, 0), TODAY.atTime(10, 0), 250_000, 250_000);
		RentalOrder dailyLater = order(13L, r101, OrderStatus.CHECKED_IN, CheckInMode.SELF, TODAY.minusDays(1).atTime(14, 0), TODAY.plusDays(1).atTime(12, 0), 500_000, 500_000);
		dailyLater.setRentalType(RentalType.DAILY);
		dailyLater.scheduleSingleStay(r101, dailyLater.getCheckInAt(), TODAY.atTime(12, 0));
		dailyLater.moveTo(r301, TODAY.plusDays(1).atTime(12, 0));
		when(orderRepository.findStaying()).thenReturn(List.of(overstay, pending, staying, dailyLater));

		RentalOrder arrivalSent = order(20L, r101, OrderStatus.BOOKED, CheckInMode.SELF, TODAY.atTime(13, 0), TODAY.atTime(15, 0), 200_000, 100_000);
		RentalOrder arrivalStaff = order(21L, r102, OrderStatus.BOOKED, CheckInMode.STAFF, TODAY.atTime(14, 0), TODAY.atTime(16, 0), 200_000, 100_000);
		RentalOrder tomorrow = order(22L, r101, OrderStatus.BOOKED, CheckInMode.STAFF, TODAY.plusDays(1).atTime(9, 0), TODAY.plusDays(1).atTime(11, 0), 200_000, 100_000);
		when(orderRepository.findBookedStaysEndingAfter(NOW)).thenReturn(List.of(stay(arrivalSent), stay(arrivalStaff), stay(tomorrow)));
		when(activityLogRepository.findOrderIdsWithAction(ActivityAction.DOOR_CODE_COPIED, List.of(20L))).thenReturn(Set.of(20L));
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of(r101, r102, r202, r301, r302));

		RentalOrder cancelled = order(30L, r101, OrderStatus.CANCELLED, CheckInMode.SELF, TODAY.minusDays(6).atTime(9, 0), TODAY.minusDays(6).atTime(11, 0), 400_000, 200_000);
		cancelled.setRefundAmount(100_000L);
		when(orderRepository.findCheckingInBetween(TODAY.minusDays(6).atStartOfDay(), TODAY.plusDays(1).atStartOfDay()))
				.thenReturn(List.of(staying, overstay, pending, arrivalSent, arrivalStaff, cancelled));
		when(orderRepository.findCheckingInBetween(TODAY.withDayOfMonth(1).atStartOfDay(), LocalDate.of(2026, 11, 1).atStartOfDay()))
				.thenReturn(List.of(staying, overstay, dailyLater, cancelled));
		when(orderRepository.findStaysBetween(any(), eq(NOW))).thenReturn(List.of());

		DashboardDto dto = service.overview(true);

		assertThat(dto.onShift()).extracting(DashboardDto.OnShift::fullName).containsExactly("Lê Thị Hồng");
		assertThat(dto.rooms()).extracting(DashboardDto.RoomCard::roomNumber, DashboardDto.RoomCard::state, DashboardDto.RoomCard::orderId,
				DashboardDto.RoomCard::nextGuestName).containsExactly(
						tuple("101", RoomState.CLEANING, null, "Khách 20"),
						tuple("102", RoomState.CHECKED_IN, 10L, "Khách 21"),
						tuple("202", RoomState.OVERSTAY, 11L, null),
						tuple("301", RoomState.CHECKED_IN, 13L, null),
						tuple("302", RoomState.PENDING_CHECKOUT, 12L, null));
		assertThat(dto.rooms().get(4).acceptingBookings()).isFalse();
		assertThat(dto.checkInsToday()).isEqualTo(5);
		assertThat(dto.checkedInToday()).isEqualTo(3);
		assertThat(dto.tasks()).extracting(DashboardDto.Task::kind, DashboardDto.Task::orderId, DashboardDto.Task::staffName,
				DashboardDto.Task::dueAmount, DashboardDto.Task::doorCodeSent).containsExactly(
						tuple(TaskKind.CONFIRM_CHECKOUT, 12L, null, 0L, null),
						tuple(TaskKind.OVERSTAY, 11L, null, 0L, null),
						tuple(TaskKind.CHECK_IN, 20L, null, 100_000L, true),
						tuple(TaskKind.CHECK_OUT, 10L, "Lê Thị Hồng", 150_000L, null),
						tuple(TaskKind.CHECK_IN, 21L, null, 100_000L, null));
		assertThat(dto.revenue()).hasSize(7);
		assertThat(dto.revenue().getFirst()).isEqualTo(new DashboardDto.DayRevenue(TODAY.minusDays(6), 100_000, 100_000));
		assertThat(dto.revenue().getLast()).isEqualTo(new DashboardDto.DayRevenue(TODAY, 1_150_000, 800_000));
		assertThat(dto.monthOrders()).containsEntry(RentalType.HOURLY, 2).containsEntry(RentalType.DAILY, 1)
				.containsEntry(RentalType.OVERNIGHT, 0);
	}

	@Test
	void staffHasNoRevenueAndEmptyArrivalsSkipDoorCodeLookup() {
		when(accountRepository.findAll()).thenReturn(List.of());
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of(r102));

		DashboardDto dto = service.overview(false);

		assertThat(dto.revenue()).isNull();
		assertThat(dto.rooms()).extracting(DashboardDto.RoomCard::state, DashboardDto.RoomCard::checkInMode)
				.containsExactly(tuple(RoomState.EMPTY, CheckInMode.SELF));
		assertThat(dto.tasks()).isEmpty();
		verifyNoInteractions(activityLogRepository);
	}

	@Test
	void currentRoomFollowsStartedStay() {
		RentalOrder moved = order(1L, r101, OrderStatus.CHECKED_IN, CheckInMode.SELF, NOW.minusHours(2), NOW.plusHours(1), 0, 0);
		moved.moveTo(r202, NOW.plusHours(3));

		assertThat(DashboardService.currentRoom(moved, NOW)).isSameAs(r101);
		assertThat(DashboardService.currentRoom(moved, NOW.plusHours(2))).isSameAs(r202);
	}

	@Test
	void occupancyCountsOverlapWithinRange() {
		LocalDateTime from = TODAY.withDayOfMonth(1).atStartOfDay();
		LocalDateTime now = from.plusDays(1);
		RentalOrder before = order(1L, r101, OrderStatus.CHECKED_OUT, CheckInMode.SELF, from.minusHours(6), from.plusHours(6), 0, 0);
		RentalOrder after = order(2L, r101, OrderStatus.BOOKED, CheckInMode.SELF, now.minusHours(6), now.plusHours(6), 0, 0);

		assertThat(DashboardService.occupancyPercent(List.of(stay(before), stay(after)), 2, from, now)).isEqualTo(25);
		assertThat(DashboardService.occupancyPercent(List.of(stay(before)), 0, from, now)).isZero();
	}

	private static RentalOrder order(long id, Room room, OrderStatus status, CheckInMode mode, LocalDateTime in, LocalDateTime out,
			long total, long paid) {
		RentalOrder o = new RentalOrder();
		setId(RentalOrder.class, o, id);
		o.scheduleSingleStay(room, in, out);
		o.setStatus(status);
		o.setCheckInMode(mode);
		o.setRentalType(RentalType.HOURLY);
		o.setGuestName("Khách " + id);
		o.setTotalAmount(total);
		o.setDeposit(Math.min(paid, 100_000));
		if (paid > 100_000) {
			OrderPayment payment = new OrderPayment();
			payment.setAmount(paid - 100_000);
			o.addPayment(payment);
		}
		return o;
	}

	private static OrderStay stay(RentalOrder order) {
		return order.getStays().getFirst();
	}

	private static Room room(long id, String number) {
		Room room = new Room();
		setId(Room.class, room, id);
		room.setRoomNumber(number);
		room.setAcceptingBookings(true);
		return room;
	}

	private static Account account(long id, String name, AccountStatus status) {
		Account a = new Account();
		setId(Account.class, a, id);
		a.setFullName(name);
		a.setStatus(status);
		return a;
	}

	private static WorkShift shift(Long accountId, String name, LocalDateTime start, LocalDateTime end) {
		WorkShift s = new WorkShift();
		s.setAccountId(accountId);
		s.setName(name);
		s.setStartAt(start);
		s.setEndAt(end);
		return s;
	}

	private static <T> void setId(Class<T> type, T target, Long id) {
		try {
			var field = type.getDeclaredField("id");
			field.setAccessible(true);
			field.set(target, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
