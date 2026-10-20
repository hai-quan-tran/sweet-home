package com.sweethome.surcharge;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Một khoảng ngày gửi lên khi lưu phụ thu kiểu {@code DATE_RANGE}.
 *
 * @param name     tên dịp
 * @param fromDate ngày bắt đầu
 * @param toDate   ngày kết thúc, phải không trước {@code fromDate}
 */
public record SurchargeDateRangeRequest(
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 100, message = "Tối đa 100 ký tự") String name,
		@NotNull(message = "Bắt buộc nhập") LocalDate fromDate,
		@NotNull(message = "Bắt buộc nhập") LocalDate toDate) {
}
