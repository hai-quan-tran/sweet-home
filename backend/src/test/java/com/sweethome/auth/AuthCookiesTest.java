package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

/**
 * Kiểm tra thuộc tính cookie chứa token: HttpOnly, SameSite, Path, Max-Age.
 */
class AuthCookiesTest {

	@Test
	void accessTokenCookieHasExpectedAttributesWhenSecure() {
		AuthCookies cookies = new AuthCookies(true);
		ResponseCookie cookie = cookies.accessTokenCookie("tok", 1800);

		assertThat(cookie.getName()).isEqualTo("access_token");
		assertThat(cookie.getValue()).isEqualTo("tok");
		assertThat(cookie.isHttpOnly()).isTrue();
		assertThat(cookie.isSecure()).isTrue();
		assertThat(cookie.getSameSite()).isEqualTo("Lax");
		assertThat(cookie.getPath()).isEqualTo("/api");
		assertThat(cookie.getMaxAge().getSeconds()).isEqualTo(1800);
	}

	@Test
	void secureFlagFollowsConfigForDev() {
		AuthCookies cookies = new AuthCookies(false);
		assertThat(cookies.refreshTokenCookie("r", 3600).isSecure()).isFalse();
	}

	@Test
	void clearCookiesExpireImmediatelyWithEmptyValue() {
		AuthCookies cookies = new AuthCookies(true);

		assertThat(cookies.clearAccessTokenCookie().getMaxAge().getSeconds()).isZero();
		assertThat(cookies.clearAccessTokenCookie().getValue()).isEmpty();
		assertThat(cookies.clearRefreshTokenCookie().getMaxAge().getSeconds()).isZero();
	}
}
