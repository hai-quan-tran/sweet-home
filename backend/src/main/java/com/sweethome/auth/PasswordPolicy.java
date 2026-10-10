package com.sweethome.auth;

import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;

import com.sweethome.common.error.BusinessException;

/**
 * Quy tắc mật khẩu: tối thiểu 8 ký tự, có cả chữ và số.
 */
public final class PasswordPolicy {

	private static final Pattern VALID = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{8,}$");

	private PasswordPolicy() {
	}

	/**
	 * Kiểm tra mật khẩu đúng quy tắc, ném lỗi nghiệp vụ nếu không đạt.
	 *
	 * @param rawPassword mật khẩu cần kiểm tra
	 */
	public static void validate(String rawPassword) {
		if (rawPassword == null || !VALID.matcher(rawPassword).matches()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số");
		}
	}
}
