package com.sweethome.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Tạo và xoá cookie HttpOnly chứa access/refresh token.
 */
@Component
public class AuthCookies {

	public static final String ACCESS_TOKEN = "access_token";
	public static final String REFRESH_TOKEN = "refresh_token";
	private static final String PATH = "/api";

	private final boolean secure;

	public AuthCookies(@Value("${app.cookie.secure}") boolean secure) {
		this.secure = secure;
	}

	/**
	 * Cookie chứa access token, sống bằng thời hạn access token.
	 *
	 * @param token    access token JWT
	 * @param ttlSeconds thời gian sống (giây)
	 * @return cookie HttpOnly, SameSite=Lax
	 */
	public ResponseCookie accessTokenCookie(String token, long ttlSeconds) {
		return build(ACCESS_TOKEN, token, ttlSeconds);
	}

	/**
	 * Cookie chứa refresh token.
	 *
	 * @param token      refresh token gốc
	 * @param ttlSeconds thời gian sống (giây)
	 * @return cookie HttpOnly, SameSite=Lax
	 */
	public ResponseCookie refreshTokenCookie(String token, long ttlSeconds) {
		return build(REFRESH_TOKEN, token, ttlSeconds);
	}

	/**
	 * Cookie rỗng để xoá access token (đăng xuất).
	 *
	 * @return cookie hết hạn ngay
	 */
	public ResponseCookie clearAccessTokenCookie() {
		return build(ACCESS_TOKEN, "", 0);
	}

	/**
	 * Cookie rỗng để xoá refresh token (đăng xuất).
	 *
	 * @return cookie hết hạn ngay
	 */
	public ResponseCookie clearRefreshTokenCookie() {
		return build(REFRESH_TOKEN, "", 0);
	}

	private ResponseCookie build(String name, String value, long ttlSeconds) {
		return ResponseCookie.from(name, value)
				.httpOnly(true)
				.secure(secure)
				.sameSite("Lax")
				.path(PATH)
				.maxAge(ttlSeconds)
				.build();
	}
}
