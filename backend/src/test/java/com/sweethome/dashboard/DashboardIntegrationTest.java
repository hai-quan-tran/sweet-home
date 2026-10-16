package com.sweethome.dashboard;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;

/**
 * Kiểm tra API Tổng quan qua filter chain và DB thật: chạy được các truy vấn, Quản lý có doanh thu 7 ngày,
 * Nhân viên không có, chưa đăng nhập bị chặn.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DashboardIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	@Test
	void revenueOnlyForManager() throws Exception {
		String suffix = String.valueOf(System.nanoTime());
		mvc.perform(get("/dashboard").cookie(login("mgr_dash_" + suffix, AccountRole.MANAGER)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.revenue.length()").value(7))
				.andExpect(jsonPath("$.monthOrders.HOURLY").isNumber());
		mvc.perform(get("/dashboard").cookie(login("stf_dash_" + suffix, AccountRole.STAFF)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.revenue").doesNotExist())
				.andExpect(jsonPath("$.rooms").isArray());
		mvc.perform(get("/dashboard")).andExpect(status().isUnauthorized());
	}

	/** Tạo tài khoản, đăng nhập và trả cookie access_token. */
	private MockCookie login(String username, AccountRole role) throws Exception {
		Account account = new Account();
		account.setUsername(username);
		account.setPasswordHash(passwordEncoder.encode("Secret123"));
		account.setFullName("Test " + role);
		account.setRole(role);
		account.setMustChangePassword(false);
		accountRepository.save(account);
		String header = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(username)))
				.andExpect(status().isOk()).andReturn().getResponse().getHeaders(HttpHeaders.SET_COOKIE).stream()
				.filter(h -> h.startsWith("access_token=")).findFirst().orElseThrow();
		return new MockCookie("access_token", header.substring("access_token=".length(), header.indexOf(';')));
	}
}
