package com.sweethome.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu thêm/sửa một khoản thu.
 *
 * @param amount số tiền thu
 * @param method hình thức thu
 * @param note   ghi chú, có thể bỏ trống
 */
public record OrderPaymentRequest(
		@Positive(message = "Phải lớn hơn 0") long amount,
		@NotNull(message = "Bắt buộc nhập") PaymentMethod method,
		@Size(max = 255, message = "Tối đa 255 ký tự") String note) {
}
