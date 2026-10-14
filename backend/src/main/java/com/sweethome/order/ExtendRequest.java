package com.sweethome.order;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Dữ liệu gia hạn (dùng cả cho xem trước).
 *
 * @param type          thêm giờ hay thêm ngày
 * @param quantity      số giờ/ngày thêm, ≥ 1
 * @param collectNow    thu phí gia hạn ngay (true) hay cộng vào lúc trả phòng (false); bắt buộc gửi — Jackson 3
 *                      mặc định báo lỗi 400 khi thiếu trường kiểu nguyên thuỷ
 * @param paymentMethod hình thức thu, bắt buộc khi thu ngay
 */
public record ExtendRequest(
		@NotNull(message = "Bắt buộc nhập") ExtendType type,
		@NotNull(message = "Bắt buộc nhập") @Min(value = 1, message = "Tối thiểu 1") Integer quantity,
		boolean collectNow,
		PaymentMethod paymentMethod) {
}
