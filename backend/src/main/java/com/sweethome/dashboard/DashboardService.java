package com.sweethome.dashboard;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.activity.ActivityAction;
import com.sweethome.activity.ActivityLogRepository;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountStatus;
import com.sweethome.dashboard.DashboardDto.DayRevenue;
import com.sweethome.dashboard.DashboardDto.OnShift;
import com.sweethome.dashboard.DashboardDto.RoomCard;
import com.sweethome.dashboard.DashboardDto.RoomState;
import com.sweethome.dashboard.DashboardDto.Task;
import com.sweethome.dashboard.DashboardDto.TaskKind;
import com.sweethome.order.OrderDto;
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
 * Số liệu màn Tổng quan (business-rules.md mục Tổng quan): tình trạng phòng, việc cần làm hôm nay, doanh thu
 * 7 ngày (chỉ Quản lý), cơ cấu đơn và công suất của tháng.
 */
@Service
public class DashboardService {

	static final int REVENUE_DAYS = 7;

	private final RentalOrderRepository orderRepository;
	private final RoomRepository roomRepository;
	private final WorkShiftRepository shiftRepository;
	private final AccountRepository accountRepository;
	private final ActivityLogRepository activityLogRepository;
	private final Clock clock;

	public DashboardService(RentalOrderRepository orderRepository, RoomRepository roomRepository,
			WorkShiftRepository shiftRepository, AccountRepository accountRepository,
			ActivityLogRepository activityLogRepository, Clock clock) {
		this.orderRepository = orderRepository;
		this.roomRepository = roomRepository;
		this.shiftRepository = shiftRepository;
		this.accountRepository = accountRepository;
		this.activityLogRepository = activityLogRepository;
		this.clock = clock;
	}

	/**
	 * Số liệu Tổng quan tại thời điểm hiện tại.
	 *
	 * @param manager người xem là Quản lý (mới có doanh thu)
	 * @return dữ liệu màn Tổng quan
	 */
	@Transactional(readOnly = true)
	public DashboardDto overview(boolean manager) {
		// Bỏ phần lẻ giây: trình duyệt (Safari trên iPad) không đọc được chuỗi giờ có 7 chữ số thập phân.
		LocalDateTime now = LocalDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
		LocalDate today = now.toLocalDate();
		LocalDateTime dayStart = today.atStartOfDay();
		LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();
		Map<Long, String> names = activeAccountNames();
		List<WorkShift> shifts = shiftRepository.findOverlapping(dayStart, dayStart.plusDays(1)).stream()
				.filter(s -> names.containsKey(s.getAccountId())).toList();
		List<OnShift> onShift = shifts.stream().filter(s -> covers(s, now))
				.map(s -> new OnShift(names.get(s.getAccountId()), s.getName())).toList();
		List<RentalOrder> staying = orderRepository.findStaying();
		List<OrderStay> booked = orderRepository.findBookedStaysEndingAfter(now);
		List<Room> rooms = roomRepository.findAllByOrderByRoomNumberAsc();

		List<RentalOrder> week = orderRepository.findCheckingInBetween(dayStart.minusDays(REVENUE_DAYS - 1), dayStart.plusDays(1));
		List<RentalOrder> arrivals = week.stream()
				.filter(o -> o.getStatus() != OrderStatus.CANCELLED && !o.getCheckInAt().isBefore(dayStart)).toList();
		int checkedIn = (int) arrivals.stream().filter(o -> o.getStatus() != OrderStatus.BOOKED).count();

		Map<RentalType, Integer> monthOrders = new EnumMap<>(RentalType.class);
		for (RentalType type : RentalType.values()) {
			monthOrders.put(type, 0);
		}
		orderRepository.findCheckingInBetween(monthStart, monthStart.plusMonths(1)).stream()
				.filter(o -> o.getStatus() != OrderStatus.CANCELLED)
				.forEach(o -> monthOrders.merge(o.getRentalType(), 1, Integer::sum));
		long openRooms = rooms.stream().filter(Room::isAcceptingBookings).count();

		return new DashboardDto(now, onShift, roomCards(now, rooms, staying, booked), arrivals.size(), checkedIn,
				tasks(now, staying, booked, shifts, names), manager ? revenue(today, week) : null, monthOrders,
				occupancyPercent(orderRepository.findStaysBetween(monthStart, now), openRooms, monthStart, now));
	}

	/** Tình trạng từng phòng: đơn đang ở (theo chặng hiện tại) hoặc Chờ dọn / Trống, kèm khách kế tiếp. */
	private static List<RoomCard> roomCards(LocalDateTime now, List<Room> rooms, List<RentalOrder> staying, List<OrderStay> booked) {
		Map<Long, RentalOrder> current = new HashMap<>();
		staying.forEach(o -> current.putIfAbsent(currentRoom(o, now).getId(), o));
		Map<Long, OrderStay> next = new HashMap<>();
		booked.forEach(s -> next.putIfAbsent(s.getRoom().getId(), s));
		return rooms.stream().map(room -> {
			RentalOrder o = current.get(room.getId());
			OrderStay n = next.get(room.getId());
			boolean has = o != null;
			RoomState state = has ? RoomState.valueOf(o.getStatus().name())
					: room.isNeedsCleaning() ? RoomState.CLEANING : RoomState.EMPTY;
			CheckInMode mode = has ? o.getCheckInMode() : n != null ? n.getOrder().getCheckInMode() : room.getDefaultCheckInMode();
			return new RoomCard(room.getId(), room.getRoomNumber(), room.getName(), state, room.isAcceptingBookings(), mode,
					has ? o.getId() : null, has ? o.getGuestName() : null, has ? o.getRentalType() : null,
					has ? o.getCheckInAt() : null, has ? o.getCheckOutAt() : null,
					n == null ? null : n.getOrder().getGuestName(), n == null ? null : n.getStartAt());
		}).toList();
	}

	/**
	 * Phòng khách đang ở: chặng mới nhất đã bắt đầu (đơn chuyển phòng vẫn ở phòng cũ cho tới khi chặng cũ kết thúc),
	 * chưa chặng nào bắt đầu thì chặng đầu.
	 */
	static Room currentRoom(RentalOrder order, LocalDateTime now) {
		Room room = order.getStays().isEmpty() ? order.getRoom() : order.getStays().getFirst().getRoom();
		for (OrderStay stay : order.getStays()) {
			if (!stay.getStartAt().isAfter(now)) {
				room = stay.getRoom();
			}
		}
		return room;
	}

	/** Việc chưa xong hôm nay: chờ xác nhận trả, quá giờ, trả phòng hôm nay, nhận phòng hôm nay; theo giờ. */
	private List<Task> tasks(LocalDateTime now, List<RentalOrder> staying, List<OrderStay> booked, List<WorkShift> shifts,
			Map<Long, String> names) {
		LocalDateTime dayStart = now.toLocalDate().atStartOfDay();
		LocalDateTime dayEnd = dayStart.plusDays(1);
		List<Task> tasks = new ArrayList<>();
		for (RentalOrder o : staying) {
			TaskKind kind = switch (o.getStatus()) {
				case PENDING_CHECKOUT -> TaskKind.CONFIRM_CHECKOUT;
				case OVERSTAY -> TaskKind.OVERSTAY;
				default -> o.getCheckOutAt().isBefore(dayEnd) ? TaskKind.CHECK_OUT : null;
			};
			if (kind != null) {
				tasks.add(task(kind, o, o.getCheckOutAt(), shifts, names, null));
			}
		}
		List<RentalOrder> arrivals = booked.stream().map(OrderStay::getOrder)
				.filter(o -> !o.getCheckInAt().isBefore(dayStart) && o.getCheckInAt().isBefore(dayEnd)).distinct().toList();
		Set<Long> sent = doorCodeSent(arrivals.stream().filter(o -> o.getCheckInMode() == CheckInMode.SELF)
				.map(RentalOrder::getId).toList());
		for (RentalOrder o : arrivals) {
			tasks.add(task(TaskKind.CHECK_IN, o, o.getCheckInAt(), shifts, names,
					o.getCheckInMode() == CheckInMode.SELF ? sent.contains(o.getId()) : null));
		}
		tasks.sort(Comparator.comparing(Task::at));
		return tasks;
	}

	/** Dựng một việc; đơn nhân viên đón (nhận/trả hôm nay) kèm người trực lúc đó. */
	private static Task task(TaskKind kind, RentalOrder o, LocalDateTime at, List<WorkShift> shifts, Map<Long, String> names,
			Boolean doorCodeSent) {
		String staff = null;
		if (o.getCheckInMode() == CheckInMode.STAFF && (kind == TaskKind.CHECK_IN || kind == TaskKind.CHECK_OUT)) {
			staff = shifts.stream().filter(s -> covers(s, at)).findFirst().map(s -> names.get(s.getAccountId())).orElse(null);
		}
		return new Task(kind, o.getId(), OrderDto.codeOf(o.getId()), at, o.getGuestName(), o.getRoom().getRoomNumber(),
				o.getCheckInMode(), staff, Math.max(0, o.getTotalAmount() - o.getPaidAmount()), doorCodeSent);
	}

	/**
	 * Doanh thu từng ngày trong 7 ngày đến hôm nay, theo ngày nhận phòng: đơn chưa huỷ tính tổng tiền, đơn huỷ tính
	 * cọc giữ lại (đã thu − hoàn).
	 */
	static List<DayRevenue> revenue(LocalDate today, List<RentalOrder> orders) {
		Map<LocalDate, long[]> perDay = new TreeMap<>();
		today.minusDays(REVENUE_DAYS - 1).datesUntil(today.plusDays(1)).forEach(d -> perDay.put(d, new long[2]));
		for (RentalOrder o : orders) {
			long[] day = perDay.get(o.getCheckInAt().toLocalDate());
			if (day == null) {
				continue;
			}
			long paid = o.getPaidAmount();
			if (o.getStatus() == OrderStatus.CANCELLED) {
				long kept = paid - (o.getRefundAmount() == null ? 0 : o.getRefundAmount());
				day[0] += kept;
				day[1] += kept;
			} else {
				day[0] += o.getTotalAmount();
				day[1] += paid;
			}
		}
		return perDay.entrySet().stream().map(e -> new DayRevenue(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
	}

	/** Công suất (%) = số phút có khách trong {@code [from, now)} / (số phòng đang nhận đặt × số phút đó), tối đa 100. */
	static int occupancyPercent(List<OrderStay> stays, long openRooms, LocalDateTime from, LocalDateTime now) {
		long total = openRooms * Duration.between(from, now).toMinutes();
		if (total <= 0) {
			return 0;
		}
		long occupied = stays.stream().mapToLong(s -> Math.max(0, Duration.between(
				s.getStartAt().isBefore(from) ? from : s.getStartAt(), s.getEndAt().isAfter(now) ? now : s.getEndAt()).toMinutes())).sum();
		return (int) Math.min(100, Math.round(occupied * 100.0 / total));
	}

	/**
	 * Trong các đơn cho trước, đơn nào đã gửi mã cửa (đã sao chép tin nhắn có mã cửa).
	 *
	 * @param orderIds id đơn
	 * @return id đơn đã gửi mã
	 */
	Set<Long> doorCodeSent(Collection<Long> orderIds) {
		return orderIds.isEmpty() ? Set.of() : activityLogRepository.findOrderIdsWithAction(ActivityAction.DOOR_CODE_COPIED, orderIds);
	}

	/** Họ tên các tài khoản đang hoạt động theo id. */
	private Map<Long, String> activeAccountNames() {
		return accountRepository.findAll().stream().filter(a -> a.getStatus() == AccountStatus.ACTIVE)
				.collect(Collectors.toMap(Account::getId, Account::getFullName));
	}

	/** Ca chứa thời điểm {@code at} ({@code [start, end)}). */
	private static boolean covers(WorkShift shift, LocalDateTime at) {
		return !shift.getStartAt().isAfter(at) && shift.getEndAt().isAfter(at);
	}
}
