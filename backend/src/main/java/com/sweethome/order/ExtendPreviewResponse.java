package com.sweethome.order;

import java.time.LocalDateTime;

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
 */
public record ExtendPreviewResponse(long hourPrice, long dayPrice, LocalDateTime currentCheckOutAt,
		LocalDateTime newCheckOutAt, long fee, NextOrder nextOrder, LocalDateTime maxCheckOutAt, Integer maxExtraHours,
		boolean available) {

	/**
	 * Đơn kế tiếp của phòng.
	 *
	 * @param code      mã đơn
	 * @param guestName tên khách
	 * @param checkInAt giờ bắt đầu ở phòng này
	 */
	public record NextOrder(String code, String guestName, LocalDateTime checkInAt) {
	}
}
