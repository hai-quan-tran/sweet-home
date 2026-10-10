package com.sweethome.auth;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Đọc access token từ cookie, xác thực và nạp vào SecurityContext cho request hiện tại.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtService jwtService;

	public JwtAuthenticationFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		readCookie(request, AuthCookies.ACCESS_TOKEN)
				.flatMap(jwtService::parseAccessToken)
				.ifPresent(principal -> {
					var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name()));
					var authentication = new UsernamePasswordAuthenticationToken(principal, null, authorities);
					SecurityContextHolder.getContext().setAuthentication(authentication);
				});
		chain.doFilter(request, response);
	}

	private Optional<String> readCookie(HttpServletRequest request, String name) {
		if (request.getCookies() == null) {
			return Optional.empty();
		}
		for (Cookie cookie : request.getCookies()) {
			if (name.equals(cookie.getName())) {
				return Optional.of(cookie.getValue());
			}
		}
		return Optional.empty();
	}
}
