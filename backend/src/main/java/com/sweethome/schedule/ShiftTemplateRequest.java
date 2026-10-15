package com.sweethome.schedule;

import java.time.LocalTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu thêm/sửa ca mẫu.
 *
 * @param name      tên ca (Sáng, Chiều...)
 * @param startTime giờ bắt đầu
 * @param endTime   giờ kết thúc (≤ giờ bắt đầu = hôm sau)
 * @param color     màu hiển thị 1–6
 */
public record ShiftTemplateRequest(
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 50, message = "Tối đa 50 ký tự") String name,
		@NotNull(message = "Bắt buộc nhập") LocalTime startTime,
		@NotNull(message = "Bắt buộc nhập") LocalTime endTime,
		@NotNull(message = "Bắt buộc chọn") @Min(value = 1, message = "Màu 1–6") @Max(value = 6, message = "Màu 1–6") Integer color) {
}
