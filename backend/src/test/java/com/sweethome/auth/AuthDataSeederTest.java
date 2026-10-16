package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra tạo tài khoản admin chỉ khi DB chưa có tài khoản nào, mật khẩu ban đầu lấy từ cấu hình.
 */
@ExtendWith(MockitoExtension.class)
class AuthDataSeederTest {

	@Mock
	private AccountRepository accountRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	@Test
	void createsAdminWithConfiguredPassword() {
		when(accountRepository.count()).thenReturn(0L);
		when(passwordEncoder.encode("Khoidau2026")).thenReturn("hashed-admin");

		new AuthDataSeeder(accountRepository, passwordEncoder, "Khoidau2026").run(null);

		verify(accountRepository).save(argThat(a -> a.getUsername().equals("admin") && a.getRole() == AccountRole.MANAGER
				&& a.isMustChangePassword() && a.getPasswordHash().equals("hashed-admin")));
	}

	@Test
	void doesNothingWhenAccountsAlreadyExist() {
		when(accountRepository.count()).thenReturn(1L);

		new AuthDataSeeder(accountRepository, passwordEncoder, "").run(null);

		verify(accountRepository, never()).save(any());
	}

	@Test
	void stopsWhenPasswordMissingOrWeak() {
		when(accountRepository.count()).thenReturn(0L);

		assertThatThrownBy(() -> new AuthDataSeeder(accountRepository, passwordEncoder, " ").run(null))
				.isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> new AuthDataSeeder(accountRepository, passwordEncoder, "12345678").run(null))
				.isInstanceOf(BusinessException.class);
		verify(accountRepository, never()).save(any());
	}
}
