package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Kiểm tra khoá tạm khi đăng nhập sai nhiều lần trên DB thật. Cố ý không {@code @Transactional}: mỗi request là một
 * transaction riêng như khi chạy thật, nên bắt được lỗi số lần sai bị rollback cùng lỗi đăng nhập. Tự xoá tài khoản test.
 */
@SpringBootTest
@AutoConfigureMockMvc
class LoginLockoutIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private JdbcTemplate jdbcTemplate;

	private String username;

	@BeforeEach
	void setUp() {
		username = "lock_" + System.nanoTime();
		Account account = new Account();
		account.setUsername(username);
		account.setPasswordHash(passwordEncoder.encode("Secret123"));
		account.setFullName("Test khoá tạm");
		account.setRole(AccountRole.STAFF);
		account.setMustChangePassword(false);
		accountRepository.save(account);
	}

	@AfterEach
	void tearDown() {
		jdbcTemplate.update("delete from refresh_token where account_id in (select id from account where username = ?)", username);
		jdbcTemplate.update("delete from account where username = ?", username);
	}

	@Test
	void fiveWrongPasswordsLockEvenTheCorrectOne() throws Exception {
		for (int i = 0; i < 4; i++) {
			login("Wrong1234").andExpect(status().isUnauthorized());
		}
		assertThat(accountRepository.findByUsername(username).orElseThrow().getFailedLoginCount()).isEqualTo(4);

		login("Wrong1234").andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.detail").value(
				"Đăng nhập sai quá nhiều lần, thử lại sau 15 phút"));
		login("Secret123").andExpect(status().isTooManyRequests());
		assertThat(accountRepository.findByUsername(username).orElseThrow().getLoginLockedUntil()).isNotNull();
	}

	@Test
	void correctPasswordResetsCount() throws Exception {
		login("Wrong1234").andExpect(status().isUnauthorized());
		login("Secret123").andExpect(status().isOk());

		assertThat(accountRepository.findByUsername(username).orElseThrow().getFailedLoginCount()).isZero();
	}

	private ResultActions login(String password) throws Exception {
		return mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"username\":\"%s\",\"password\":\"%s\",\"rememberDevice\":false}".formatted(username, password)));
	}
}
