package com.sweethome.settings;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu sửa thông tin homestay.
 */
public record HomestayInfoUpdateRequest(
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 100, message = "Tối đa 100 ký tự") String name,
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 30, message = "Tối đa 30 ký tự") String hotline,
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 255, message = "Tối đa 255 ký tự") String address,
		@Size(max = 255, message = "Tối đa 255 ký tự") String mapLink,
		@Size(max = 100, message = "Tối đa 100 ký tự") String wifiName,
		@Size(max = 100, message = "Tối đa 100 ký tự") String wifiPassword) {
}
