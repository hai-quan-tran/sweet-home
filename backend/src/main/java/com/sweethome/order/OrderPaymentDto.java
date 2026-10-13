package com.sweethome.order;

import java.time.Instant;

/** Một khoản thu thêm của đơn, kèm thời điểm và người thu. */
public record OrderPaymentDto(Long id, long amount, PaymentMethod method, String note, Instant createdAt,
		String createdBy) {

	public static OrderPaymentDto from(OrderPayment payment) {
		return new OrderPaymentDto(payment.getId(), payment.getAmount(), payment.getMethod(), payment.getNote(),
				payment.getCreatedAt(), payment.getCreatedBy());
	}
}
