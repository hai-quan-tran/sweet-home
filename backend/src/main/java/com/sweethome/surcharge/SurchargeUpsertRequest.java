package com.sweethome.surcharge;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Set;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu thêm/sửa phụ thu. Tuỳ {@code whenType}, chỉ một số trường có nghĩa (kiểm tra trong
 * {@code SurchargeService}, vì là validate chéo field, không phải annotation đơn):
 * {@code amount} (WEEKDAY % · DATE_RANGE % · EXTRA_GUEST đ/khách · MANUAL đ/lần), {@code graceMinutes}
 * (OVERSTAY), {@code weekdays} (WEEKDAY), {@code dateRanges} (DATE_RANGE).
 *
 * @param name         tên phụ thu
 * @param whenType     điều kiện áp dụng
 * @param amount       mức thu, bắt buộc trừ khi OVERSTAY
 * @param graceMinutes phút ân hạn, chỉ dùng khi OVERSTAY
 * @param weekdays     các ngày trong tuần, chỉ dùng khi WEEKDAY
 * @param dateRanges   các khoảng ngày, chỉ dùng khi DATE_RANGE
 * @param roomTypeIds  id các hạng phòng áp dụng
 */
public record SurchargeUpsertRequest(
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 100, message = "Tối đa 100 ký tự") String name,
		@NotNull(message = "Bắt buộc nhập") SurchargeWhenType whenType,
		Long amount,
		Integer graceMinutes,
		Set<DayOfWeek> weekdays,
		List<@Valid SurchargeDateRangeRequest> dateRanges,
		@NotEmpty(message = "Phải chọn ít nhất một hạng phòng") List<Long> roomTypeIds) {
}
