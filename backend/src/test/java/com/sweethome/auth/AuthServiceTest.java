package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra nghiệp vụ đăng nhập, cấp lại token, đăng xuất, đổi mật khẩu.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

	@Mock
	private AccountRepository accountRepository;
	@Mock
	private RefreshTokenRepository refreshTokenRepository;
	@Mock
	private PasswordEncoder passwordEncoder;

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 16, 9, 0);

	private AuthService authService;
	private Account account;

	@BeforeEach
	void setUp() {
		JwtService jwtService = new JwtService("dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdW5pdC10ZXN0cy0zMmJ5dGVz", 30);
		authService = new AuthService(accountRepository, refreshTokenRepository, jwtService, passwordEncoder,
				Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE), 7, 30);
		account = AccountTestFactory.create(1L, "manager1", "hashed", AccountRole.MANAGER, AccountStatus.ACTIVE, false);
	}

	@Test
	void loginSucceedsAndIssuesTokens() {
		when(accountRepository.findByUsername("manager1")).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("secret12", "hashed")).thenReturn(true);

		AuthService.AuthResult result = authService.login("manager1", "secret12", false);

		assertThat(result.account()).isEqualTo(account);
		assertThat(result.accessToken()).isNotBlank();
		assertThat(result.refreshTokenTtlSeconds()).isEqualTo(7 * 86400);
		verify(refreshTokenRepository).save(any());
	}

	@Test
	void loginWithRememberDeviceUsesLongerTtl() {
		when(accountRepository.findByUsername("manager1")).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("secret12", "hashed")).thenReturn(true);

		AuthService.AuthResult result = authService.login("manager1", "secret12", true);

		assertThat(result.refreshTokenTtlSeconds()).isEqualTo(30 * 86400);
	}

	@Test
	void loginFailsWhenUsernameUnknown() {
		when(accountRepository.findByUsername("ghost")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authService.login("ghost", "whatever1", false))
				.isInstanceOf(BusinessException.class)
				.satisfies(e -> assertThat(((BusinessException) e).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
	}

	@Test
	void loginFailsWhenPasswordWrong() {
		when(accountRepository.findByUsername("manager1")).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("wrong123", "hashed")).thenReturn(false);

		assertThatThrownBy(() -> authService.login("manager1", "wrong123", false))
				.isInstanceOf(BusinessException.class);
		verify(refreshTokenRepository, never()).save(any());
	}

	@Test
	void lockedAccountIsReportedOnlyWithCorrectPassword() {
		Account locked = AccountTestFactory.create(2L, "staff1", "hashed", AccountRole.STAFF, AccountStatus.LOCKED, false);
		when(accountRepository.findByUsername("staff1")).thenReturn(Optional.of(locked));
		when(passwordEncoder.matches("secret12", "hashed")).thenReturn(true);
		when(passwordEncoder.matches("wrong123", "hashed")).thenReturn(false);

		assertThatThrownBy(() -> authService.login("staff1", "wrong123", false))
				.satisfies(e -> assertThat(((BusinessException) e).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
		assertThatThrownBy(() -> authService.login("staff1", "secret12", false))
				.satisfies(e -> assertThat(((BusinessException) e).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
	}

	@Test
	void unknownUsernameStillChecksAHash() {
		when(accountRepository.findByUsername("ghost")).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authService.login("ghost", "whatever1", false)).isInstanceOf(BusinessException.class);
		verify(passwordEncoder).matches(eq("whatever1"), any());
	}

	@Test
	void wrongPasswordCountsAndFifthLocksFor15Minutes() {
		account.setFailedLoginCount(3);
		when(accountRepository.findByUsername("manager1")).thenReturn(Optional.of(account));

		assertThatThrownBy(() -> authService.login("manager1", "wrong123", false))
				.satisfies(e -> assertThat(((BusinessException) e).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED));
		verify(accountRepository).updateLoginFailures(1L, 4, null);

		account.setFailedLoginCount(4);
		assertThatThrownBy(() -> authService.login("manager1", "wrong123", false))
				.satisfies(e -> {
					assertThat(((BusinessException) e).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
					assertThat(e.getMessage()).contains("15 phút");
				});
		verify(accountRepository).updateLoginFailures(1L, 0, NOW.plusMinutes(15));
	}

	@Test
	void temporarilyLockedRejectsEvenCorrectPasswordUntilExpiry() {
		account.setLoginLockedUntil(NOW.plusMinutes(4).plusSeconds(10));
		when(accountRepository.findByUsername("manager1")).thenReturn(Optional.of(account));

		assertThatThrownBy(() -> authService.login("manager1", "secret12", false))
				.satisfies(e -> assertThat(e.getMessage()).contains("5 phút"));
		verify(passwordEncoder, never()).matches(eq("secret12"), any());

		account.setLoginLockedUntil(NOW.minusSeconds(1));
		when(passwordEncoder.matches("secret12", "hashed")).thenReturn(true);
		authService.login("manager1", "secret12", false);
		verify(accountRepository).updateLoginFailures(1L, 0, null);
	}

	@Test
	void refreshRotatesValidToken() {
		RefreshToken stored = new RefreshToken();
		stored.setAccount(account);
		stored.setExpiresAt(Instant.now().plusSeconds(3600));
		when(refreshTokenRepository.findValid(any(), any())).thenReturn(Optional.of(stored));

		AuthService.AuthResult result = authService.refresh("raw-token-value");

		assertThat(stored.isRevoked()).isTrue();
		assertThat(result.account()).isEqualTo(account);
		verify(refreshTokenRepository).save(any());
	}

	@Test
	void refreshFailsWhenTokenNotFoundOrExpired() {
		when(refreshTokenRepository.findValid(any(), any())).thenReturn(Optional.empty());

		assertThatThrownBy(() -> authService.refresh("missing")).isInstanceOf(BusinessException.class);
	}

	@Test
	void refreshFailsWhenAccountLocked() {
		Account locked = AccountTestFactory.create(2L, "staff1", "hashed", AccountRole.STAFF, AccountStatus.LOCKED, false);
		RefreshToken stored = new RefreshToken();
		stored.setAccount(locked);
		stored.setExpiresAt(Instant.now().plusSeconds(3600));
		when(refreshTokenRepository.findValid(any(), any())).thenReturn(Optional.of(stored));

		assertThatThrownBy(() -> authService.refresh("raw")).isInstanceOf(BusinessException.class);
	}

	@Test
	void logoutRevokesMatchingToken() {
		RefreshToken stored = new RefreshToken();
		stored.setAccount(account);
		stored.setExpiresAt(Instant.now().plusSeconds(3600));
		when(refreshTokenRepository.findValid(any(), any())).thenReturn(Optional.of(stored));

		authService.logout("raw-token");

		assertThat(stored.isRevoked()).isTrue();
	}

	@Test
	void logoutDoesNothingWhenNoCookiePresent() {
		authService.logout(null);

		verify(refreshTokenRepository, never()).findValid(any(), any());
	}

	@Test
	void changePasswordFailsWhenOldPasswordWrong() {
		when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("wrong123", "hashed")).thenReturn(false);

		assertThatThrownBy(() -> authService.changePassword(1L, "wrong123", "newpass123"))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void changePasswordFailsWhenNewPasswordBreaksPolicy() {
		when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("secret12", "hashed")).thenReturn(true);

		assertThatThrownBy(() -> authService.changePassword(1L, "secret12", "tooshort"))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void changePasswordSucceedsAndRevokesOldSessions() {
		when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
		when(passwordEncoder.matches("secret12", "hashed")).thenReturn(true);
		when(passwordEncoder.encode("newpass123")).thenReturn("new-hashed");

		AuthService.AuthResult result = authService.changePassword(1L, "secret12", "newpass123");

		assertThat(account.getPasswordHash()).isEqualTo("new-hashed");
		assertThat(account.isMustChangePassword()).isFalse();
		verify(refreshTokenRepository).revokeAllByAccountId(1L);
		assertThat(result.account()).isEqualTo(account);
	}
}
