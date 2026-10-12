package com.sweethome.surcharge;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
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

import com.jayway.jsonpath.JsonPath;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;
import com.sweethome.room.RoomTypeRepository;

/**
 * Kiểm tra GET /surcharges qua request thật (không bọc {@code @Transactional}) sau khi đã tạo
 * phụ thu có collection lazy (weekdays). Cố ý KHÔNG dùng {@code @Transactional} như
 * {@link SurchargeIntegrationTest}: transaction bọc quanh cả test giữ Session Hibernate mở xuyên
 * suốt test, che mất lỗi chỉ xảy ra khi request thật đóng Session giữa hai lần gọi (vì
 * {@code spring.jpa.open-in-view=false}) — từng gây lỗi 500 "Failed to write request" do
 * {@code SurchargeDto} trả thẳng {@code PersistentSet} của Hibernate thay vì copy ra tập thường.
 * Tự dọn dữ liệu đã tạo ở {@link #cleanup()} vì không có rollback tự động.
 */
@SpringBootTest
@AutoConfigureMockMvc
class SurchargeSerializationIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private SurchargeRepository surchargeRepository;
	@Autowired
	private RoomTypeRepository roomTypeRepository;

	private Long accountId;
	private Long surchargeId;
	private Long roomTypeId;

	@AfterEach
	void cleanup() {
		if (surchargeId != null) {
			surchargeRepository.deleteById(surchargeId);
		}
		if (roomTypeId != null) {
			roomTypeRepository.deleteById(roomTypeId);
		}
		if (accountId != null) {
			accountRepository.deleteById(accountId);
		}
	}

	@Test
	void getSurchargesAfterCreatingWeekdaySurchargeDoesNotFailToSerialize() throws Exception {
		String suffix = String.valueOf(System.nanoTime());
		String managerAccessToken;
		String managerCsrf;

		Account account = new Account();
		account.setUsername("mgr_ser_" + suffix);
		account.setPasswordHash(passwordEncoder.encode("Secret123"));
		account.setFullName("Test MANAGER");
		account.setRole(AccountRole.MANAGER);
		account.setMustChangePassword(false);
		accountRepository.save(account);
		accountId = account.getId();

		MvcResult loginResult = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content("{\"username\":\"%s\",\"password\":\"Secret123\",\"rememberDevice\":false}".formatted(account.getUsername())))
				.andExpect(status().isOk())
				.andReturn();
		managerAccessToken = cookieValue(loginResult, "access_token");
		managerCsrf = cookieValue(loginResult, "XSRF-TOKEN");

		String pricingPayload = """
				{"roomTypes":[{"id":null,"name":"Tiêu chuẩn %s","twoHourPrice":150000,"extraHourPrice":50000,
				  "overnightPrice":350000,"dailyPrice":500000}],
				 "settings":{"minHours":2,"overnightCheckIn":"21:00","overnightCheckOut":"12:00",
				  "dailyCheckIn":"14:00","dailyCheckOut":"12:00"}}
				""".formatted(suffix);
		MvcResult pricingResult = mvc.perform(put("/room-types/overview")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(pricingPayload))
				.andExpect(status().isOk())
				.andReturn();
		roomTypeId = ((Number) JsonPath.read(pricingResult.getResponse().getContentAsString(), "$.roomTypes[0].id")).longValue();

		String weekdayPayload = """
				{"name":"Cuối tuần","whenType":"WEEKDAY","amount":10,"weekdays":["FRIDAY","SATURDAY"],"roomTypeIds":[%d]}
				""".formatted(roomTypeId);
		MvcResult createResult = mvc.perform(post("/surcharges")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(weekdayPayload))
				.andExpect(status().isOk())
				.andReturn();
		surchargeId = ((Number) JsonPath.read(createResult.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(get("/surcharges").cookie(new MockCookie("access_token", managerAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.id == %d)].weekdays[0]".formatted(surchargeId)).value("FRIDAY"));
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
