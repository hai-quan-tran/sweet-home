package com.sweethome.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.sweethome.room.CheckInMode;

/**
 * Dữ liệu thêm/sửa mẫu tin nhắn.
 *
 * @param name                  tên mẫu
 * @param body                  nội dung mẫu
 * @param defaultForCheckInMode hình thức check-in tự chọn sẵn mẫu này; null nếu chọn tay
 */
public record MessageTemplateUpsertRequest(
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 100, message = "Tối đa 100 ký tự") String name,
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 2000, message = "Tối đa 2000 ký tự") String body,
		CheckInMode defaultForCheckInMode) {
}
