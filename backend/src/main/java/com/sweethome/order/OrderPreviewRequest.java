package com.sweethome.order;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Dữ liệu "xem trước" khi đang điền form Tạo/Sửa đơn: tính giờ trả, kiểm tra phòng trống, tính tiền —
 * không lưu DB. Chỉ cần các trường ảnh hưởng tới lịch/giá, bỏ qua thông tin khách.
 *
 * @param roomId      phòng
 * @param rentalType  loại thuê
 * @param checkInDate ngày nhận
 * @param checkInTime giờ nhận, bắt buộc nếu {@code rentalType == HOURLY}
 * @param quantity    số giờ thuê (HOURLY) hoặc số ngày thuê (DAILY); bỏ qua với OVERNIGHT
 * @param guestCount  số khách, dùng tính phụ thu vượt khách
 * @param discount    giảm giá
 * @param deposit     tiền cọc, chỉ dùng tính "còn phải thu" hiển thị trước
 * @param excludeOrderId đơn đang sửa (bỏ qua khi kiểm tra trùng lịch), null khi tạo mới
 */
public record OrderPreviewRequest(
		@NotNull(message = "Bắt buộc nhập") Long roomId,
		@NotNull(message = "Bắt buộc nhập") RentalType rentalType,
		@NotNull(message = "Bắt buộc nhập") LocalDate checkInDate,
		LocalTime checkInTime,
		Integer quantity,
		int guestCount,
		@PositiveOrZero(message = "Không được âm") long discount,
		@PositiveOrZero(message = "Không được âm") long deposit,
		Long excludeOrderId) {
}
