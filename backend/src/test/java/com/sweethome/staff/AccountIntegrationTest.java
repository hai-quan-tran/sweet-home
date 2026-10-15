package com.sweethome.staff;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;

/**
 * Kiểm tra API tài khoản qua filter chain thật: chỉ Quản lý thêm/sửa; khoá tài khoản hoặc hạ vai trò
 * có hiệu lực ngay với access token đang dùng.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AccountIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	private String suffix;
	private Session manager;

	@BeforeEach
	void setUp() throws Exception {
		suffix = String.valueOf(System.nanoTime());
		manager = login(saveAccount("mgr_acc_" + suffix, AccountRole.MANAGER));
	}

	@Test
	void managerCreatesStaffWhoMustChangePasswordAndStaffCannotCreate() throws Exception {
		String username = "stf_new_" + suffix;
		mvc.perform(withSession(post("/accounts"), manager).contentType(MediaType.APPLICATION_JSON).content(payload(username, "STAFF", true, "Temp1234")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.role").value("STAFF"))
				.andExpect(jsonPath("$.idNumberMasked").value("•••••••• 7302"));

		Session staff = loginWith(username, "Temp1234");
		mvc.perform(withSession(get("/auth/me"), staff))
				.andExpect(jsonPath("$.mustChangePassword").value(true));
		mvc.perform(withSession(get("/accounts"), staff)).andExpect(status().isOk());
		mvc.perform(withSession(post("/accounts"), staff).contentType(MediaType.APPLICATION_JSON).content(payload("x_" + suffix, "STAFF", true, "Temp1234")))
				.andExpect(status().isForbidden());
	}

	@Test
	void lockingAccountBlocksItsCurrentTokenImmediately() throws Exception {
		Account staffAccount = saveAccount("stf_lock_" + suffix, AccountRole.STAFF);
		Session staff = login(staffAccount);
		mvc.perform(withSession(get("/auth/me"), staff)).andExpect(status().isOk());

		mvc.perform(withSession(put("/accounts/" + staffAccount.getId()), manager).contentType(MediaType.APPLICATION_JSON)
						.content(payload(staffAccount.getUsername(), "STAFF", false, null)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("LOCKED"));

		mvc.perform(withSession(get("/auth/me"), staff)).andExpect(status().isUnauthorized());
	}

	@Test
	void demotedManagerLosesManagerRightsImmediately() throws Exception {
		Account otherManager = saveAccount("mgr_dem_" + suffix, AccountRole.MANAGER);
		Session other = login(otherManager);

		mvc.perform(withSession(put("/accounts/" + otherManager.getId()), manager).contentType(MediaType.APPLICATION_JSON)
						.content(payload(otherManager.getUsername(), "STAFF", true, null)))
				.andExpect(status().isOk());

		mvc.perform(withSession(post("/accounts"), other).contentType(MediaType.APPLICATION_JSON).content(payload("y_" + suffix, "STAFF", true, "Temp1234")))
				.andExpect(status().isForbidden());
	}

	private String payload(String username, String role, boolean active, String password) {
		return """
				{"fullName":"Nguyễn Thảo Vy","phone":"0978345120","idNumber":"079201007302","startDate":"2026-10-12",
				 "username":"%s","password":%s,"mustChangePassword":true,"role":"%s","active":%s}
				""".formatted(username, password == null ? "null" : "\"" + password + "\"", role, active);
	}

	private Account saveAccount(String username, AccountRole role) {
		Account account = new Account();
		account.setUsername(username);
		account.setPasswordHash(passwordEncoder.encode("Secret123"));
		account.setFullName("Test " + role);
		account.setRole(role);
		account.setMustChangePassword(false);
		return accountRepository.save(account);
	}

	private Session login(Account account) throws Exception {
		return loginWith(account.getUsername(), "Secret123");
	}

	private Session loginWith(String username, String password) throws Exception {
		MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"%s\",\"rememberDevice\":false}".formatted(username, password)))
				.andExpect(status().isOk())
				.andReturn();
		return new Session(cookieValue(result, "access_token"), cookieValue(result, "XSRF-TOKEN"));
	}

	private MockHttpServletRequestBuilder withSession(MockHttpServletRequestBuilder builder, Session session) {
		return builder.cookie(new MockCookie("access_token", session.accessToken()), new MockCookie("XSRF-TOKEN", session.csrf()))
				.header("X-XSRF-TOKEN", session.csrf());
	}

	private String cookieValue(MvcResult result, String name) {
		List<String> headers = result.getResponse().getHeaders(HttpHeaders.SET_COOKIE);
		for (String header : headers) {
			if (header.startsWith(name + "=")) {
				String afterName = header.substring(name.length() + 1);
				return afterName.substring(0, afterName.indexOf(';'));
			}
		}
		throw new AssertionError("Không thấy cookie " + name);
	}

	/** Cookie đăng nhập của một tài khoản trong test. */
	private record Session(String accessToken, String csrf) {
	}
}
