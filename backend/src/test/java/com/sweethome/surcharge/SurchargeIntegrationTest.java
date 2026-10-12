package com.sweethome.surcharge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;

/**
 * Kiểm tra API phụ thu qua filter chain thật: Quản lý toàn quyền, Nhân viên chỉ xem.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SurchargeIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	private String managerAccessToken;
	private String managerCsrf;
	private String staffAccessToken;
	private long roomTypeId;

	@BeforeEach
	void setUp() throws Exception {
		String suffix = String.valueOf(System.nanoTime());
		managerAccessToken = loginNewAccount("mgr_" + suffix, AccountRole.MANAGER);
		staffAccessToken = loginNewAccount("stf_" + suffix, AccountRole.STAFF);
		roomTypeId = createRoomType(suffix);
	}

	private long createRoomType(String suffix) throws Exception {
		String payload = """
				{"roomTypes":[{"id":null,"name":"Tiêu chuẩn %s","twoHourPrice":150000,"extraHourPrice":50000,
				  "overnightPrice":350000,"dailyPrice":500000}],
				 "settings":{"minHours":2,"overnightCheckIn":"21:00","overnightCheckOut":"12:00",
				  "dailyCheckIn":"14:00","dailyCheckOut":"12:00"}}
				""".formatted(suffix);
		MvcResult result = mvc.perform(put("/room-types/overview")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(payload))
				.andExpect(status().isOk())
				.andReturn();
		return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.roomTypes[0].id")).longValue();
	}

	private String loginNewAccount(String username, AccountRole role) throws Exception {
		Account account = new Account();
		account.setUsername(username);
		account.setPasswordHash(passwordEncoder.encode("Secret123"));
		account.setFullName("Test " + role);
		account.setRole(role);
		account.setMustChangePassword(false);
		accountRepository.save(account);

		MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(username)))
				.andExpect(status().isOk())
				.andReturn();
		if (role == AccountRole.MANAGER) {
			managerCsrf = cookieValue(result, "XSRF-TOKEN");
		}
		return cookieValue(result, "access_token");
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

	private String manualSurchargePayload() {
		return """
				{"name":"Hút thuốc trong phòng","whenType":"MANUAL","amount":200000,"roomTypeIds":[%d]}
				""".formatted(roomTypeId);
	}

	@Test
	void managerCanCreateSurchargeThenStaffOnlyReads() throws Exception {
		MvcResult createResult = mvc.perform(post("/surcharges")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(manualSurchargePayload()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.whenType").value("MANUAL"))
				.andExpect(jsonPath("$.active").value(true))
				.andReturn();
		long surchargeId = ((Number) JsonPath.read(createResult.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(get("/surcharges").cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk());

		mvc.perform(post("/surcharges").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(manualSurchargePayload()))
				.andExpect(status().isForbidden());

		mvc.perform(patch("/surcharges/" + surchargeId + "/active")
						.cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
				.andExpect(status().isForbidden());
	}

	@Test
	void managerCanHideThenRestoreSurcharge() throws Exception {
		MvcResult createResult = mvc.perform(post("/surcharges")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(manualSurchargePayload()))
				.andReturn();
		long surchargeId = ((Number) JsonPath.read(createResult.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(patch("/surcharges/" + surchargeId + "/active")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"active\":false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.active").value(false));

		mvc.perform(patch("/surcharges/" + surchargeId + "/active")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"active\":true}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.active").value(true));
	}
}
