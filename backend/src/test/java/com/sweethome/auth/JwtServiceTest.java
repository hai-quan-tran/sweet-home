package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Kiểm tra sinh/kiểm tra access token và băm refresh token.
 */
class JwtServiceTest {

	private JwtService jwtService;

	@BeforeEach
	void setUp() {
		// Khoá base64 256-bit chỉ dùng cho test, không liên quan tới khoá thật
		jwtService = new JwtService("dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdW5pdC10ZXN0cy0zMmJ5dGVz", 30);
	}

	@Test
	void generatedTokenCanBeParsedBack() {
		Account account = AccountTestFactory.create(42L, "manager1", "hash", AccountRole.MANAGER, AccountStatus.ACTIVE, false);
		String token = jwtService.generateAccessToken(account);

		var principal = jwtService.parseAccessToken(token).orElseThrow();

		assertThat(principal.accountId()).isEqualTo(42L);
		assertThat(principal.username()).isEqualTo("manager1");
		assertThat(principal.role()).isEqualTo(AccountRole.MANAGER);
	}

	@Test
	void garbageTokenIsRejected() {
		assertThat(jwtService.parseAccessToken("not-a-jwt")).isEmpty();
	}

	@Test
	void tokenSignedWithDifferentKeyIsRejected() {
		Account account = AccountTestFactory.create(1L, "x", "hash", AccountRole.STAFF, AccountStatus.ACTIVE, false);
		String token = jwtService.generateAccessToken(account);
		JwtService other = new JwtService("YW5vdGhlci10ZXN0LXNlY3JldC1rZXktMzItYnl0ZXMtbG9uZw==", 30);

		assertThat(other.parseAccessToken(token)).isEmpty();
	}

	@Test
	void accessTokenTtlMatchesConfiguredMinutes() {
		assertThat(jwtService.accessTokenTtlSeconds()).isEqualTo(30 * 60);
	}

	@Test
	void refreshTokenValuesAreRandomAndUrlSafe() {
		String a = jwtService.generateRefreshTokenValue();
		String b = jwtService.generateRefreshTokenValue();

		assertThat(a).isNotEqualTo(b);
		assertThat(a).doesNotContain("+", "/", "=");
	}

	@Test
	void hashIsDeterministicAndDiffersPerInput() {
		String h1 = jwtService.hash("abc");
		String h2 = jwtService.hash("abc");
		String h3 = jwtService.hash("xyz");

		assertThat(h1).isEqualTo(h2).hasSize(64);
		assertThat(h1).isNotEqualTo(h3);
	}
}
