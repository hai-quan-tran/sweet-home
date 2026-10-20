package com.sweethome.staff;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.sweethome.auth.AccountRole;

/**
 * Dữ liệu thêm/sửa tài khoản nhân viên.
 *
 * @param fullName           họ tên
 * @param phone              số điện thoại
 * @param idNumber           CCCD, có thể bỏ trống (khi sửa: bỏ trống = giữ giá trị cũ)
 * @param startDate          ngày bắt đầu làm, có thể bỏ trống
 * @param username           tên đăng nhập (chỉ dùng khi thêm, không đổi được sau đó)
 * @param password           mật khẩu tạm: bắt buộc khi thêm; khi sửa bỏ trống = giữ mật khẩu cũ
 * @param mustChangePassword bắt đổi mật khẩu ở lần đăng nhập tới (áp dụng khi đặt mật khẩu)
 * @param role               vai trò
 * @param active             true = hoạt động, false = khoá
 */
public record AccountUpsertRequest(
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 100, message = "Tối đa 100 ký tự") String fullName,
		@NotBlank(message = "Bắt buộc nhập") @Size(max = 20, message = "Tối đa 20 ký tự") String phone,
		@Pattern(regexp = "^[0-9 ]*$", message = "Chỉ gồm chữ số") @Size(max = 20, message = "Tối đa 20 ký tự") String idNumber,
		LocalDate startDate,
		@NotBlank(message = "Bắt buộc nhập")
		@Pattern(regexp = "^[A-Za-z0-9._-]{3,50}$", message = "3–50 ký tự: chữ không dấu, số, dấu chấm, gạch") String username,
		String password,
		boolean mustChangePassword,
		@NotNull(message = "Bắt buộc chọn") AccountRole role,
		boolean active) {
}
