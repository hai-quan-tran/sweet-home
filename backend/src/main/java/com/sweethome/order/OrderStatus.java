package com.sweethome.order;

/**
 * Trạng thái đơn thuê. GĐ4 chỉ tạo được đơn ở trạng thái {@code BOOKED}; các chuyển trạng thái
 * còn lại (nhận phòng, quá giờ, chờ xác nhận trả, trả phòng, huỷ) làm ở GĐ5 "Vòng đời đơn".
 */
public enum OrderStatus {
	/** Đã đặt. */
	BOOKED,
	/** Đang ở. */
	CHECKED_IN,
	/** Quá giờ trả phòng. */
	OVERSTAY,
	/** Chờ xác nhận trả phòng. */
	PENDING_CHECKOUT,
	/** Đã trả phòng. */
	CHECKED_OUT,
	/** Đã huỷ. */
	CANCELLED
}
