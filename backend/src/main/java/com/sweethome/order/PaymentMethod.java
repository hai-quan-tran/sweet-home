package com.sweethome.order;

/** Hình thức thanh toán (cọc và các khoản thu). */
public enum PaymentMethod {
	TRANSFER("chuyển khoản"), CASH("tiền mặt");

	private final String label;

	PaymentMethod(String label) {
		this.label = label;
	}

	/** Tên hiển thị (chữ thường), dùng cho nội dung nhật ký. */
	public String label() {
		return label;
	}
}
