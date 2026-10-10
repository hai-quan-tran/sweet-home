package com.sweethome.auth;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.sweethome.common.error.BusinessException;

/**
 * API đăng nhập, cấp lại token, đăng xuất và đổi mật khẩu. Token truyền qua cookie HttpOnly,
 * không trả trong body để tránh lộ qua localStorage/JS.
 *
 * <p>Cookie được ghi trực tiếp qua {@code response.addHeader} (không qua {@code ResponseEntity.header}),
 * vì {@code ResponseEntity} ghi đè (put) toàn bộ giá trị "Set-Cookie" đã có, xoá mất cookie CSRF
 * mà {@code CsrfFilter} vừa đặt trước đó trong cùng filter chain.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService authService;
	private final AccountRepository accountRepository;
	private final AuthCookies cookies;
	private final JwtService jwtService;

	public AuthController(AuthService authService, AccountRepository accountRepository, AuthCookies cookies,
			JwtService jwtService) {
		this.authService = authService;
		this.accountRepository = accountRepository;
		this.cookies = cookies;
		this.jwtService = jwtService;
	}

	/** Đăng nhập, đặt cookie access/refresh token. */
	@PostMapping("/login")
	public AccountSummary login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
		AuthService.AuthResult result = authService.login(request.username(), request.password(), request.rememberDevice());
		return withTokenCookies(result, response);
	}

	/** Cấp lại access token từ refresh token còn hiệu lực trong cookie. */
	@PostMapping("/refresh")
	public AccountSummary refresh(@CookieValue(name = AuthCookies.REFRESH_TOKEN, required = false) String refreshToken,
			HttpServletResponse response) {
		if (refreshToken == null) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn");
		}
		AuthService.AuthResult result = authService.refresh(refreshToken);
		return withTokenCookies(result, response);
	}

	/** Đăng xuất: thu hồi refresh token và xoá cookie. */
	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logout(@CookieValue(name = AuthCookies.REFRESH_TOKEN, required = false) String refreshToken,
			HttpServletResponse response) {
		authService.logout(refreshToken);
		response.addHeader(HttpHeaders.SET_COOKIE, cookies.clearAccessTokenCookie().toString());
		response.addHeader(HttpHeaders.SET_COOKIE, cookies.clearRefreshTokenCookie().toString());
	}

	/** Thông tin tài khoản đang đăng nhập, dùng để nạp lại trạng thái khi mở lại app. */
	@GetMapping("/me")
	public AccountSummary me(@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal) {
		Account account = accountRepository.findById(principal.accountId())
				.orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
		return AccountSummary.from(account);
	}

	/** Đổi mật khẩu, bắt buộc ở lần đăng nhập đầu hoặc tự chọn đổi sau đó. */
	@PostMapping("/change-password")
	public AccountSummary changePassword(@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal,
			@Valid @RequestBody ChangePasswordRequest request, HttpServletResponse response) {
		AuthService.AuthResult result = authService.changePassword(principal.accountId(), request.oldPassword(), request.newPassword());
		return withTokenCookies(result, response);
	}

	private AccountSummary withTokenCookies(AuthService.AuthResult result, HttpServletResponse response) {
		response.addHeader(HttpHeaders.SET_COOKIE,
				cookies.accessTokenCookie(result.accessToken(), jwtService.accessTokenTtlSeconds()).toString());
		response.addHeader(HttpHeaders.SET_COOKIE,
				cookies.refreshTokenCookie(result.refreshToken(), result.refreshTokenTtlSeconds()).toString());
		return AccountSummary.from(result.account());
	}
}
