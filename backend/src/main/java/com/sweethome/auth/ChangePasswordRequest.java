package com.sweethome.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Dữ liệu đổi mật khẩu.
 *
 * @param oldPassword mật khẩu hiện tại
 * @param newPassword mật khẩu mới
 */
public record ChangePasswordRequest(
		@NotBlank(message = "Bắt buộc nhập") String oldPassword,
		@NotBlank(message = "Bắt buộc nhập") String newPassword) {
}
