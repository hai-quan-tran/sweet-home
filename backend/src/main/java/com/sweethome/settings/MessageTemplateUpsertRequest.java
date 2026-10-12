package com.sweethome.settings;

import jakarta.validation.constraints.NotBlank;

import com.sweethome.room.CheckInMode;

/**
 * Dữ liệu thêm/sửa mẫu tin nhắn.
 *
 * @param name                  tên mẫu
 * @param body                  nội dung mẫu
 * @param defaultForCheckInMode hình thức check-in tự chọn sẵn mẫu này; null nếu chọn tay
 */
public record MessageTemplateUpsertRequest(
		@NotBlank(message = "Bắt buộc nhập") String name,
		@NotBlank(message = "Bắt buộc nhập") String body,
		CheckInMode defaultForCheckInMode) {
}
