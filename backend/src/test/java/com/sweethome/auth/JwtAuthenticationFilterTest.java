package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import jakarta.servlet.http.Cookie;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Kiểm tra bộ lọc đọc cookie access_token, nạp lại tài khoản từ DB và nạp Authentication vào SecurityContext.
 */
class JwtAuthenticationFilterTest {

	private final JwtService jwtService = new JwtService("dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdW5pdC10ZXN0cy0zMmJ5dGVz", 30);
	private final AccountRepository accountRepository = mock(AccountRepository.class);
	private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtService, accountRepository);

	@BeforeEach
	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void validCookieAuthenticatesRequest() throws Exception {
		Account account = AccountTestFactory.create(7L, "staff1", "hash", AccountRole.STAFF, AccountStatus.ACTIVE, false);
		when(accountRepository.findById(7L)).thenReturn(Optional.of(account));

		filter.doFilter(requestWithToken(account), new MockHttpServletResponse(), new MockFilterChain());

		var auth = SecurityContextHolder.getContext().getAuthentication();
		assertThat(auth).isNotNull();
		assertThat(auth.getAuthorities().toString()).contains("ROLE_STAFF");
	}

	@Test
	void roleIsReadFromDatabaseNotToken() throws Exception {
		Account account = AccountTestFactory.create(7L, "staff1", "hash", AccountRole.MANAGER, AccountStatus.ACTIVE, false);
		MockHttpServletRequest request = requestWithToken(account);
		account.setRole(AccountRole.STAFF);
		when(accountRepository.findById(7L)).thenReturn(Optional.of(account));

		filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

		var auth = SecurityContextHolder.getContext().getAuthentication();
		assertThat(auth.getAuthorities().toString()).contains("ROLE_STAFF").doesNotContain("ROLE_MANAGER");
		assertThat(((JwtService.AuthenticatedPrincipal) auth.getPrincipal()).role()).isEqualTo(AccountRole.STAFF);
	}

	@Test
	void lockedAccountIsNotAuthenticated() throws Exception {
		Account account = AccountTestFactory.create(7L, "staff1", "hash", AccountRole.STAFF, AccountStatus.LOCKED, false);
		when(accountRepository.findById(7L)).thenReturn(Optional.of(account));

		filter.doFilter(requestWithToken(account), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
	}

	@Test
	void missingCookieLeavesContextEmpty() throws Exception {
		filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
	}

	@Test
	void invalidCookieLeavesContextEmptyAndChainContinues() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setCookies(new Cookie(AuthCookies.ACCESS_TOKEN, "garbage"));
		MockFilterChain chain = new MockFilterChain();

		filter.doFilter(request, new MockHttpServletResponse(), chain);

		assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
		assertThat(chain.getRequest()).isNotNull();
	}

	private MockHttpServletRequest requestWithToken(Account account) {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setCookies(new Cookie(AuthCookies.ACCESS_TOKEN, jwtService.generateAccessToken(account)));
		return request;
	}
}
