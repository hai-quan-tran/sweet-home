package com.sweethome.schedule;

import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.jayway.jsonpath.JsonPath;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;

/**
 * Kiểm tra API Lịch làm qua filter chain thật và DB thật (rollback sau mỗi test): ca mẫu mặc định có sẵn,
 * Quản lý xếp ca, chặn trùng giờ, Nhân viên chỉ xem, xoá ca mẫu không làm mất ca đã xếp.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ScheduleIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	private String[] manager;
	private String[] staff;
	private Account staffAccount;

	@BeforeEach
	void setUp() throws Exception {
		String suffix = String.valueOf(System.nanoTime());
		manager = login(saveAccount("mgr_sch_" + suffix, AccountRole.MANAGER));
		staffAccount = saveAccount("stf_sch_" + suffix, AccountRole.STAFF);
		staff = login(staffAccount);
	}

	@Test
	void defaultTemplatesExistAndManagerSchedulesWithoutOverlap() throws Exception {
		mvc.perform(withSession(get("/shift-templates"), staff))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[*].name", hasItems("Sáng", "Chiều", "Đêm")));

		String shift = shiftPayload(null, "22:00", "06:00");
		mvc.perform(withSession(post("/shifts"), manager).contentType(MediaType.APPLICATION_JSON).content(shift))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Ca lẻ"))
				.andExpect(jsonPath("$.endAt").value("2099-01-06T06:00:00"));
		mvc.perform(withSession(post("/shifts"), manager).contentType(MediaType.APPLICATION_JSON).content(shiftPayload(null, "05:00", "07:00")
						.replace("2099-01-05", "2099-01-06")))
				.andExpect(status().isConflict());

		mvc.perform(withSession(get("/shifts"), staff).param("from", "2099-01-05").param("to", "2099-01-12"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(1));
		mvc.perform(withSession(post("/shifts"), staff).contentType(MediaType.APPLICATION_JSON).content(shift))
				.andExpect(status().isForbidden());
	}

	@Test
	void deletingTemplateKeepsScheduledShiftSnapshot() throws Exception {
		MvcResult created = mvc.perform(withSession(post("/shift-templates"), manager).contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Gãy\",\"startTime\":\"10:00\",\"endTime\":\"15:00\",\"color\":4}"))
				.andExpect(status().isOk())
				.andReturn();
		long templateId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
		mvc.perform(withSession(post("/shifts"), manager).contentType(MediaType.APPLICATION_JSON)
						.content(shiftPayload(templateId, "10:00", "15:00")))
				.andExpect(status().isOk());

		mvc.perform(withSession(delete("/shift-templates/" + templateId), manager)).andExpect(status().isNoContent());

		mvc.perform(withSession(get("/shifts"), manager).param("from", "2099-01-05").param("to", "2099-01-06"))
				.andExpect(jsonPath("$[0].name").value("Gãy"))
				.andExpect(jsonPath("$[0].color").value(4))
				.andExpect(jsonPath("$[0].templateId").doesNotExist());
	}

	private String shiftPayload(Long templateId, String start, String end) {
		return """
				{"accountId":%d,"date":"2099-01-05","templateId":%s,"startTime":"%s","endTime":"%s"}
				""".formatted(staffAccount.getId(), templateId, start, end);
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

	/** Đăng nhập, trả [access token, CSRF token]. */
	private String[] login(Account account) throws Exception {
		MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(account.getUsername())))
				.andExpect(status().isOk())
				.andReturn();
		return new String[] { cookieValue(result, "access_token"), cookieValue(result, "XSRF-TOKEN") };
	}

	private MockHttpServletRequestBuilder withSession(MockHttpServletRequestBuilder builder, String[] session) {
		return builder.cookie(new MockCookie("access_token", session[0]), new MockCookie("XSRF-TOKEN", session[1]))
				.header("X-XSRF-TOKEN", session[1]);
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
}
