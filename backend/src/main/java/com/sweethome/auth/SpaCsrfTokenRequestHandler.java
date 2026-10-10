package com.sweethome.auth;

import java.util.function.Supplier;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

/**
 * Buộc CSRF token được ghi vào cookie XSRF-TOKEN ngay từ request đầu tiên (kể cả GET),
 * để SPA luôn có cookie trước khi gọi API thay đổi dữ liệu. Theo khuyến nghị của Spring Security
 * cho ứng dụng SPA dùng cookie.
 */
public final class SpaCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {

	private final CsrfTokenRequestAttributeHandler delegate = new CsrfTokenRequestAttributeHandler();

	@Override
	public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
		this.delegate.handle(request, response, csrfToken);
		csrfToken.get();
	}

	@Override
	public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
		String headerValue = request.getHeader(csrfToken.getHeaderName());
		return (headerValue != null) ? headerValue : super.resolveCsrfTokenValue(request, csrfToken);
	}
}
