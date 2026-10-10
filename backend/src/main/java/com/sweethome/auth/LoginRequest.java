package com.sweethome.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Dữ liệu đăng nhập gửi lên từ form.
 *
 * @param username       tên đăng nhập
 * @param password       mật khẩu
 * @param rememberDevice true nếu chọn "Ghi nhớ thiết bị này"
 */
public record LoginRequest(
		@NotBlank(message = "Bắt buộc nhập") String username,
		@NotBlank(message = "Bắt buộc nhập") String password,
		boolean rememberDevice) {
}
