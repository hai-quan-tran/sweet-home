package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra quy tắc mật khẩu: tối thiểu 8 ký tự, có cả chữ và số.
 */
class PasswordPolicyTest {

	@ParameterizedTest
	@ValueSource(strings = { "Abcdefg1", "matkhau123", "Sweet2026Home" })
	void acceptsPasswordsWithLettersAndDigits(String password) {
		assertThatCode(() -> PasswordPolicy.validate(password)).doesNotThrowAnyException();
	}

	@ParameterizedTest
	@ValueSource(strings = { "short1", "alllettersnodigit", "12345678", "" })
	void rejectsPasswordsBreakingTheRule(String password) {
		assertThatThrownBy(() -> PasswordPolicy.validate(password)).isInstanceOf(BusinessException.class);
	}

	@Test
	void rejectsNullPassword() {
		assertThatThrownBy(() -> PasswordPolicy.validate(null)).isInstanceOf(BusinessException.class);
	}
}
