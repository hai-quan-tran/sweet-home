package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/**
 * Kiểm tra luồng đăng nhập → đổi mật khẩu → cấp lại token → đăng xuất qua toàn bộ filter chain thật,
 * chạy trên DB dev thật (MySQL local). Mỗi test rollback sau khi chạy, trừ tài khoản admin do
 * {@link AuthDataSeeder} tạo lúc khởi động context (ngoài transaction của test).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	private String username;

	@BeforeEach
	void setUp() {
		// Tài khoản riêng cho từng test để không phụ thuộc/đổi mật khẩu của admin seed dùng chung
		username = "it_" + System.nanoTime();
		Account account = new Account();
		account.setUsername(username);
		account.setPasswordHash(passwordEncoder.encode("Secret123"));
		account.setFullName("Tài khoản test tích hợp");
		account.setRole(AccountRole.MANAGER);
		account.setMustChangePassword(true);
		accountRepository.save(account);
	}

	@Test
	void fullLoginChangePasswordRefreshLogoutFlow() throws Exception {
		MvcResult loginResult = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(username)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.mustChangePassword").value(true))
				.andReturn();
		String accessToken = cookieValue(loginResult, "access_token");
		String refreshToken = cookieValue(loginResult, "refresh_token");
		String csrfToken = cookieValue(loginResult, "XSRF-TOKEN");
		assertThat(accessToken).isNotBlank();
		assertThat(refreshToken).isNotBlank();
		assertThat(csrfToken).isNotBlank();

		mvc.perform(get("/auth/me").cookie(cookie("access_token", accessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value(username));

		MvcResult changeResult = mvc.perform(post("/auth/change-password")
						.cookie(cookie("access_token", accessToken), cookie("XSRF-TOKEN", csrfToken))
						.header("X-XSRF-TOKEN", csrfToken)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"oldPassword\":\"Secret123\",\"newPassword\":\"NewSecret456\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.mustChangePassword").value(false))
				.andReturn();
		String newAccessToken = cookieValue(changeResult, "access_token");
		String newRefreshToken = cookieValue(changeResult, "refresh_token");

		// Refresh token cũ (trước khi đổi mật khẩu) đã bị thu hồi
		mvc.perform(post("/auth/refresh").cookie(cookie("refresh_token", refreshToken)))
				.andExpect(status().isUnauthorized());

		// Refresh token mới (sau khi đổi mật khẩu) dùng được và được xoay
		MvcResult refreshResult = mvc.perform(post("/auth/refresh").cookie(cookie("refresh_token", newRefreshToken)))
				.andExpect(status().isOk())
				.andReturn();
		String rotatedAccessToken = cookieValue(refreshResult, "access_token");
		assertThat(rotatedAccessToken).isNotBlank();

		// Không đăng nhập được bằng mật khẩu cũ sau khi đã đổi
		mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(username)))
				.andExpect(status().isUnauthorized());

		mvc.perform(post("/auth/logout").cookie(cookie("refresh_token", newRefreshToken)))
				.andExpect(status().isNoContent());
		mvc.perform(get("/auth/me").cookie(cookie("access_token", newAccessToken)))
				.andExpect(status().isOk()); // access token JWT vẫn còn hạn, logout chỉ thu hồi refresh token
	}

	@Test
	void requestWithoutCookieIsUnauthorized() throws Exception {
		mvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
	}

	@Test
	void changePasswordWithoutCsrfHeaderIsForbidden() throws Exception {
		MvcResult loginResult = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(username)))
				.andReturn();
		String accessToken = cookieValue(loginResult, "access_token");

		mvc.perform(post("/auth/change-password").cookie(cookie("access_token", accessToken))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"oldPassword\":\"Secret123\",\"newPassword\":\"NewSecret456\"}"))
				.andExpect(status().isForbidden());
	}

	private org.springframework.mock.web.MockCookie cookie(String name, String value) {
		return new org.springframework.mock.web.MockCookie(name, value);
	}

	private String cookieValue(MvcResult result, String name) {
		List<String> headers = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
		for (String header : headers) {
			if (header.startsWith(name + "=")) {
				String afterName = header.substring(name.length() + 1);
				return afterName.substring(0, afterName.indexOf(';'));
			}
		}
		throw new AssertionError("Không thấy cookie " + name + " trong: " + headers);
	}
}
