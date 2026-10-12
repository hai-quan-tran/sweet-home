package com.sweethome.settings;

import jakarta.validation.constraints.NotBlank;

/**
 * Dữ liệu sửa thông tin homestay.
 */
public record HomestayInfoUpdateRequest(
		@NotBlank(message = "Bắt buộc nhập") String name,
		@NotBlank(message = "Bắt buộc nhập") String hotline,
		@NotBlank(message = "Bắt buộc nhập") String address,
		String mapLink,
		String wifiName,
		String wifiPassword) {
}
