package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.sweethome.common.error.GlobalExceptionHandler;

/**
 * Kiểm tra AuthController: cookie đặt đúng khi đăng nhập/cấp lại token, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

	@Mock
	private AuthService authService;
	@Mock
	private AccountRepository accountRepository;

	private AuthCookies cookies;
	private JwtService jwtService;
	private AuthController controller;
	private MockMvc mvc;
	private Account account;

	@BeforeEach
	void setUp() {
		cookies = new AuthCookies(false);
		jwtService = new JwtService("dGVzdC1zZWNyZXQta2V5LWZvci1qd3QtdW5pdC10ZXN0cy0zMmJ5dGVz", 30);
		controller = new AuthController(authService, accountRepository, cookies, jwtService);
		mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
		account = AccountTestFactory.create(1L, "manager1", "hashed", AccountRole.MANAGER, AccountStatus.ACTIVE, true);
	}

	@Test
	void loginSetsAccessAndRefreshCookies() throws Exception {
		when(authService.login("manager1", "secret12", false))
				.thenReturn(new AuthService.AuthResult(account, "access-jwt", "refresh-raw", 604800));

		mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"manager1\",\"password\":\"secret12\",\"rememberDevice\":false}"))
				.andExpect(status().isOk())
				.andExpect(result -> {
					var setCookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
					assertThat(setCookies).hasSize(2);
					assertThat(setCookies.toString()).contains("access_token=access-jwt").contains("refresh_token=refresh-raw");
				});
	}

	@Test
	void loginRejectsBlankUsername() throws Exception {
		mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"\",\"password\":\"secret12\",\"rememberDevice\":false}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void refreshWithoutCookieFails() throws Exception {
		mvc.perform(post("/auth/refresh")).andExpect(status().isUnauthorized());
	}

	@Test
	void logoutAlwaysClearsCookiesEvenWithoutRefreshCookie() throws Exception {
		mvc.perform(post("/auth/logout"))
				.andExpect(status().isNoContent())
				.andExpect(result -> {
					var setCookies = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
					assertThat(setCookies).hasSize(2);
				});
	}

	@Test
	void meReturnsSummaryOfAuthenticatedAccount() {
		when(accountRepository.findById(1L)).thenReturn(Optional.of(account));
		var principal = new JwtService.AuthenticatedPrincipal(1L, "manager1", AccountRole.MANAGER);

		AccountSummary summary = controller.me(principal);

		assertThat(summary.username()).isEqualTo("manager1");
		assertThat(summary.mustChangePassword()).isTrue();
	}

	@Test
	void changePasswordReturnsAccountSummaryWithNewCookies() {
		var principal = new JwtService.AuthenticatedPrincipal(1L, "manager1", AccountRole.MANAGER);
		when(authService.changePassword(1L, "secret12", "newpass123"))
				.thenReturn(new AuthService.AuthResult(account, "new-access", "new-refresh", 604800));
		MockHttpServletResponse response = new MockHttpServletResponse();

		AccountSummary summary = controller.changePassword(principal, new ChangePasswordRequest("secret12", "newpass123"), response);

		assertThat(summary.username()).isEqualTo("manager1");
		assertThat(response.getHeaders(HttpHeaders.SET_COOKIE)).hasSize(2);
	}
}
