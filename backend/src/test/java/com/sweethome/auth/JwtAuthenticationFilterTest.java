package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Kiểm tra bộ lọc đọc cookie access_token và nạp Authentication vào SecurityContext.
 */
class JwtAuthenticationFilterTest {

	private final JwtService jwtService = new JwtService("dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdW5pdC10ZXN0cy0zMmJ5dGVz", 30);
	private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService);

	@BeforeEach
	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void validCookieAuthenticatesRequest() throws Exception {
		Account account = AccountTestFactory.create(7L, "staff1", "hash", AccountRole.STAFF, AccountStatus.ACTIVE, false);
		String token = jwtService.generateAccessToken(account);
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setCookies(new Cookie(AuthCookies.ACCESS_TOKEN, token));
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain chain = new MockFilterChain();

		filter.doFilter(request, response, chain);

		var auth = SecurityContextHolder.getContext().getAuthentication();
		assertThat(auth).isNotNull();
		assertThat(auth.getAuthorities().toString()).contains("ROLE_STAFF");
	}

	@Test
	void missingCookieLeavesContextEmpty() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain chain = new MockFilterChain();

		filter.doFilter(request, response, chain);

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
	}

	@Test
	void invalidCookieLeavesContextEmptyAndChainContinues() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setCookies(new Cookie(AuthCookies.ACCESS_TOKEN, "garbage"));
		MockHttpServletResponse response = new MockHttpServletResponse();
		MockFilterChain chain = new MockFilterChain();

		filter.doFilter(request, response, chain);

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
		assertThat(chain.getRequest()).isNotNull();
	}
}
