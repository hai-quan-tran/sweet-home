package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.Set;

import jakarta.validation.constraints.NotNull;

/**
 * Dữ liệu trả phòng (dùng cả cho xem trước).
 *
 * @param actualCheckInAt    giờ nhận thực tế
 * @param actualCheckOutAt   giờ trả thực tế, dùng tính phụ thu quá giờ
 * @param manualSurchargeIds id các phụ thu "thêm tay" được chọn, có thể rỗng
 * @param paymentMethod      hình thức thu số tiền còn lại, bắt buộc khi còn phải thu
 */
public record CheckoutRequest(
		@NotNull(message = "Bắt buộc nhập") LocalDateTime actualCheckInAt,
		@NotNull(message = "Bắt buộc nhập") LocalDateTime actualCheckOutAt,
		Set<Long> manualSurchargeIds,
		PaymentMethod paymentMethod) {
}
