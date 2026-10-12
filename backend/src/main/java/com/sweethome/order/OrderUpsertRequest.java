package com.sweethome.order;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import com.sweethome.room.CheckInMode;

/**
 * Dữ liệu tạo đơn thuê.
 *
 * @param roomId          phòng
 * @param rentalType      loại thuê
 * @param checkInDate     ngày nhận
 * @param checkInTime     giờ nhận, bắt buộc nếu {@code rentalType == HOURLY}; bỏ qua với 2 loại còn lại
 * @param quantity        số giờ thuê (HOURLY, mặc định = số giờ tối thiểu) hoặc số ngày thuê (DAILY, mặc định 1); bỏ qua với OVERNIGHT
 * @param guestName       họ tên khách
 * @param guestPhone      số điện thoại khách
 * @param guestIdNumber   CCCD/hộ chiếu, có thể bỏ trống
 * @param guestCount      số khách
 * @param source          nguồn đặt
 * @param note            ghi chú, có thể bỏ trống
 * @param checkInMode     hình thức check-in cho đơn này
 * @param doorCode        mã cửa riêng cho đơn, bắt buộc nếu {@code checkInMode == SELF}
 * @param deposit         tiền cọc
 * @param depositMethod   hình thức cọc, bắt buộc nếu {@code deposit > 0}
 * @param discount        giảm giá
 * @param discountReason  lý do giảm, có thể bỏ trống
 */
public record OrderUpsertRequest(
		@NotNull(message = "Bắt buộc nhập") Long roomId,
		@NotNull(message = "Bắt buộc nhập") RentalType rentalType,
		@NotNull(message = "Bắt buộc nhập") LocalDate checkInDate,
		LocalTime checkInTime,
		Integer quantity,
		@NotBlank(message = "Bắt buộc nhập") String guestName,
		@NotBlank(message = "Bắt buộc nhập") String guestPhone,
		String guestIdNumber,
		@NotNull(message = "Bắt buộc nhập") @Positive(message = "Phải lớn hơn 0") Integer guestCount,
		@NotNull(message = "Bắt buộc nhập") OrderSource source,
		String note,
		@NotNull(message = "Bắt buộc nhập") CheckInMode checkInMode,
		String doorCode,
		@PositiveOrZero(message = "Không được âm") long deposit,
		DepositMethod depositMethod,
		@PositiveOrZero(message = "Không được âm") long discount,
		String discountReason) {
}
