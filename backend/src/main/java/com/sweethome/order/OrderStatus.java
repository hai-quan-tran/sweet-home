package com.sweethome.order;

/**
 * Trạng thái đơn thuê.
 */
public enum OrderStatus {
	BOOKED("Đã đặt"),
	CHECKED_IN("Đang ở"),
	OVERSTAY("Quá giờ"),
	PENDING_CHECKOUT("Chờ xác nhận trả"),
	CHECKED_OUT("Đã trả"),
	CANCELLED("Đã huỷ");

	private final String label;

	OrderStatus(String label) {
		this.label = label;
	}

	/** Tên hiển thị, dùng cho nội dung nhật ký. */
	public String label() {
		return label;
	}
}
