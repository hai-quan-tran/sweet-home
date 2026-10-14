package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Kết quả xem trước gia hạn tại phòng đang ở.
 *
 * @param hourPrice        giá mỗi giờ thêm (snapshot của đơn)
 * @param dayPrice         giá theo ngày (snapshot của đơn)
 * @param currentCheckOutAt giờ trả hiện tại
 * @param newCheckOutAt    giờ trả sau khi gia hạn
 * @param fee              phí gia hạn
 * @param nextOrder        đơn kế tiếp của phòng, null nếu không có
 * @param maxCheckOutAt    giờ trả muộn nhất còn giữ được phòng (cách đơn kế tiếp 1 tiếng), null nếu không giới hạn
 * @param maxExtraHours    số giờ còn thêm được tại phòng, null nếu không giới hạn
 * @param available        gia hạn được tại phòng đang ở không
 * @param moveOptions      phòng cùng giá, đã dọn, trống suốt thời gian gia hạn để chuyển khách (chỉ khi không
 *                         gia hạn được tại phòng), rỗng nếu không có
 */
public record ExtendPreviewResponse(long hourPrice, long dayPrice, LocalDateTime currentCheckOutAt,
		LocalDateTime newCheckOutAt, long fee, NextOrder nextOrder, LocalDateTime maxCheckOutAt, Integer maxExtraHours,
		boolean available, List<MoveOption> moveOptions) {

	/**
	 * Đơn kế tiếp của phòng.
	 *
	 * @param code      mã đơn
	 * @param guestName tên khách
	 * @param checkInAt giờ bắt đầu ở phòng này
	 */
	public record NextOrder(String code, String guestName, LocalDateTime checkInAt) {
	}

	/**
	 * Phòng có thể chuyển khách sang.
	 *
	 * @param roomId     id phòng
	 * @param roomNumber số phòng
	 * @param roomName   tên phòng
	 * @param maxGuests  số khách tối đa
	 * @param freeUntil  phòng trống đến lúc nào (giờ nhận của đơn kế tiếp), null nếu không giới hạn
	 */
	public record MoveOption(Long roomId, String roomNumber, String roomName, int maxGuests, LocalDateTime freeUntil) {
	}
}
