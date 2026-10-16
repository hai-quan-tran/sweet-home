package com.sweethome.dashboard;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.sweethome.order.RentalType;
import com.sweethome.room.CheckInMode;

/**
 * Dữ liệu màn Tổng quan.
 *
 * @param now               thời điểm tính
 * @param onShift           người đang trong ca
 * @param rooms             tình trạng từng phòng
 * @param checkInsToday     số đơn (chưa huỷ) có giờ nhận phòng hôm nay
 * @param checkedInToday    trong đó số đơn đã nhận phòng
 * @param tasks             việc chưa xong hôm nay, theo giờ
 * @param revenue           doanh thu 7 ngày gần nhất (hôm nay cuối cùng); null với Nhân viên
 * @param monthOrders       số đơn (chưa huỷ) của tháng theo loại thuê
 * @param occupancyPercent  công suất phòng từ đầu tháng đến bây giờ (%)
 */
public record DashboardDto(LocalDateTime now, List<OnShift> onShift, List<RoomCard> rooms, int checkInsToday,
		int checkedInToday, List<Task> tasks, List<DayRevenue> revenue, Map<RentalType, Integer> monthOrders,
		int occupancyPercent) {

	/** Tình trạng phòng: không có khách thì Trống hoặc Chờ dọn, có khách thì theo trạng thái đơn. */
	public enum RoomState {
		EMPTY, CLEANING, CHECKED_IN, OVERSTAY, PENDING_CHECKOUT
	}

	/** Loại việc cần làm. */
	public enum TaskKind {
		CONFIRM_CHECKOUT, OVERSTAY, CHECK_IN, CHECK_OUT
	}

	/**
	 * Một người đang trong ca.
	 *
	 * @param fullName  họ tên
	 * @param shiftName tên ca
	 */
	public record OnShift(String fullName, String shiftName) {
	}

	/**
	 * Một phòng.
	 *
	 * @param roomId            id phòng
	 * @param roomNumber        số phòng
	 * @param roomName          tên phòng
	 * @param state             tình trạng
	 * @param acceptingBookings phòng đang nhận đặt
	 * @param checkInMode       hình thức check-in của đơn đang ở / đơn kế tiếp, không có thì mặc định của phòng
	 * @param orderId           đơn đang ở, null nếu không có khách
	 * @param guestName         khách đang ở
	 * @param rentalType        loại thuê của đơn đang ở
	 * @param checkInAt         giờ nhận của đơn đang ở
	 * @param checkOutAt        giờ trả của đơn đang ở
	 * @param nextGuestName     khách kế tiếp (đơn Đã đặt), null nếu chưa có
	 * @param nextCheckInAt     giờ nhận của khách kế tiếp
	 */
	public record RoomCard(Long roomId, String roomNumber, String roomName, RoomState state, boolean acceptingBookings,
			CheckInMode checkInMode, Long orderId, String guestName, RentalType rentalType, LocalDateTime checkInAt,
			LocalDateTime checkOutAt, String nextGuestName, LocalDateTime nextCheckInAt) {
	}

	/**
	 * Một việc cần làm.
	 *
	 * @param kind         loại việc
	 * @param orderId      id đơn
	 * @param orderCode    mã đơn
	 * @param at           giờ của việc (giờ nhận hoặc giờ trả)
	 * @param guestName    khách
	 * @param roomNumber   số phòng
	 * @param checkInMode  hình thức check-in
	 * @param staffName    người trực lúc đó (chỉ đơn nhân viên đón, nhận/trả hôm nay), null nếu không ai
	 * @param dueAmount    số còn phải thu (việc trả phòng)
	 * @param doorCodeSent đã gửi mã cửa (chỉ việc nhận phòng của đơn khách tự check-in), null nếu không áp dụng
	 */
	public record Task(TaskKind kind, Long orderId, String orderCode, LocalDateTime at, String guestName,
			String roomNumber, CheckInMode checkInMode, String staffName, long dueAmount, Boolean doorCodeSent) {
	}

	/**
	 * Doanh thu một ngày (theo ngày nhận phòng).
	 *
	 * @param date    ngày
	 * @param revenue tổng tiền các đơn (đơn huỷ chỉ tính cọc giữ lại)
	 * @param paid    số đã thu của các đơn đó
	 */
	public record DayRevenue(LocalDate date, long revenue, long paid) {
	}
}
