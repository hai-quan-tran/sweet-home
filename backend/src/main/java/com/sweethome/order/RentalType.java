package com.sweethome.order;

/**
 * Loại thuê. Giờ nhận/trả tính khác nhau theo loại, xem {@code OrderService}.
 */
public enum RentalType {
	/** Theo giờ: khách chọn ngày + giờ nhận + số giờ thuê (≥ số giờ tối thiểu). */
	HOURLY,
	/** Qua đêm: giờ nhận/trả cố định theo khung giờ chung, luôn đúng 1 đêm. */
	OVERNIGHT,
	/** Theo ngày: khách chọn ngày nhận + số ngày thuê, giờ nhận/trả cố định theo khung giờ chung. */
	DAILY
}
