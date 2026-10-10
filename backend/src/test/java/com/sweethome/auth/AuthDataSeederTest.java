package com.sweethome.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Kiểm tra tạo tài khoản admin mặc định chỉ khi DB chưa có tài khoản nào.
 */
@ExtendWith(MockitoExtension.class)
class AuthDataSeederTest {

	@Mock
	private AccountRepository accountRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	@Test
	void createsAdminWhenNoAccountExists() {
		when(accountRepository.count()).thenReturn(0L);
		when(passwordEncoder.encode("Admin@123")).thenReturn("hashed-admin");

		new AuthDataSeeder(accountRepository, passwordEncoder).run(null);

		verify(accountRepository).save(org.mockito.ArgumentMatchers.argThat(a ->
				a.getUsername().equals("admin") && a.getRole() == AccountRole.MANAGER && a.isMustChangePassword()));
	}

	@Test
	void doesNothingWhenAccountsAlreadyExist() {
		when(accountRepository.count()).thenReturn(1L);

		new AuthDataSeeder(accountRepository, passwordEncoder).run(null);

		verify(accountRepository, never()).save(any());
	}
}
