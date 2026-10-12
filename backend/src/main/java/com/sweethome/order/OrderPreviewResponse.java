package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Kết quả "xem trước" đơn: lịch tự tính, phòng có trống không, và tiền tạm tính.
 *
 * @param checkInAt        giờ nhận đã tính
 * @param checkOutAt       giờ trả đã tính
 * @param available        phòng có trống trong khung giờ này không
 * @param conflictMessage  lý do không trống, null nếu {@code available == true}
 * @param roomPriceAmount  tiền phòng (chưa gồm phụ thu, giảm giá)
 * @param surcharges       các phụ thu áp dụng được
 * @param totalAmount      tổng tiền (tiền phòng + phụ thu − giảm giá)
 * @param dueAmount        còn phải thu sau khi trừ cọc
 */
public record OrderPreviewResponse(
		LocalDateTime checkInAt,
		LocalDateTime checkOutAt,
		boolean available,
		String conflictMessage,
		long roomPriceAmount,
		List<OrderSurchargeDto> surcharges,
		long totalAmount,
		long dueAmount) {
}
