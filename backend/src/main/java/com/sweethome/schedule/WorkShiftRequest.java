package com.sweethome.schedule;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu xếp/sửa một ca.
 *
 * @param accountId  tài khoản được xếp ca
 * @param date       ngày của ca (ngày bắt đầu)
 * @param templateId ca mẫu, null = ca lẻ
 * @param startTime  giờ bắt đầu
 * @param endTime    giờ kết thúc (≤ giờ bắt đầu = hôm sau)
 * @param note       ghi chú, có thể bỏ trống
 */
public record WorkShiftRequest(
		@NotNull(message = "Bắt buộc chọn") Long accountId,
		@NotNull(message = "Bắt buộc nhập") LocalDate date,
		Long templateId,
		@NotNull(message = "Bắt buộc nhập") LocalTime startTime,
		@NotNull(message = "Bắt buộc nhập") LocalTime endTime,
		@Size(max = 255, message = "Tối đa 255 ký tự") String note) {
}
