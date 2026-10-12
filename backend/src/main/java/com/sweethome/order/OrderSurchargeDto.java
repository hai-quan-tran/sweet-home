package com.sweethome.order;

/**
 * Một dòng phụ thu đã cộng vào đơn.
 *
 * @param name   tên phụ thu (snapshot)
 * @param amount số tiền
 */
public record OrderSurchargeDto(String name, long amount) {

	public static OrderSurchargeDto from(OrderSurcharge s) {
		return new OrderSurchargeDto(s.getName(), s.getAmount());
	}
}
