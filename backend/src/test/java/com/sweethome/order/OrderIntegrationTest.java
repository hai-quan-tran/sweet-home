package com.sweethome.order;

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
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;

/**
 * Kiểm tra API đơn thuê qua filter chain thật: Quản lý và Nhân viên đều tạo/xem được đơn.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OrderIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;

	private String managerAccessToken;
	private String managerCsrf;
	private String staffAccessToken;
	private String staffCsrf;
	private long roomId;

	@BeforeEach
	void setUp() throws Exception {
		String suffix = String.valueOf(System.nanoTime());
		managerAccessToken = loginNewAccount("mgr_ord_" + suffix, AccountRole.MANAGER, true);
		staffAccessToken = loginNewAccount("stf_ord_" + suffix, AccountRole.STAFF, false);
		roomId = createRoom(suffix);
	}

	private long createRoom(String suffix) throws Exception {
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
		long roomTypeId = ((Number) JsonPath.read(pricingResult.getResponse().getContentAsString(), "$.roomTypes[0].id")).longValue();

		String roomPayload = """
				{"roomNumber":"RO-%s","name":"Phòng test","floor":1,"roomTypeId":%d,"maxGuests":2,
				 "pricingMode":"ROOM_TYPE","defaultCheckInMode":"SELF","acceptingBookings":true}
				""".formatted(suffix, roomTypeId);
		MvcResult roomResult = mvc.perform(post("/rooms")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(roomPayload))
				.andExpect(status().isOk())
				.andReturn();
		return ((Number) JsonPath.read(roomResult.getResponse().getContentAsString(), "$.id")).longValue();
	}

	private String loginNewAccount(String username, AccountRole role, boolean captureCsrf) throws Exception {
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
		if (captureCsrf) {
			managerCsrf = cookieValue(result, "XSRF-TOKEN");
		} else {
			staffCsrf = cookieValue(result, "XSRF-TOKEN");
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

	private String orderPayload() {
		return """
				{"roomId":%d,"rentalType":"HOURLY","checkInDate":"2026-10-07","checkInTime":"15:00","quantity":3,
				 "guestName":"Phan Thu Trang","guestPhone":"0987654321","guestIdNumber":"079201007302",
				 "guestCount":2,"source":"ZALO","checkInMode":"SELF","doorCode":"482915","deposit":50000,
				 "depositMethod":"TRANSFER","discount":0}
				""".formatted(roomId);
	}

	@Test
	void staffCanCreateAndViewOrder() throws Exception {
		MvcResult createResult = mvc.perform(post("/orders")
						.cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("BOOKED"))
				.andExpect(jsonPath("$.roomPriceAmount").value(200000))
				.andExpect(jsonPath("$.guestIdNumberMasked").value("•••••••• 7302"))
				.andExpect(jsonPath("$.hasDoorCode").value(true))
				.andReturn();
		long orderId = ((Number) JsonPath.read(createResult.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(get("/orders/" + orderId).cookie(new MockCookie("access_token", managerAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.guestName").value("Phan Thu Trang"));

		mvc.perform(get("/orders/" + orderId + "/door-code").cookie(new MockCookie("access_token", managerAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.doorCode").value("482915"));
	}

	@Test
	void secondOverlappingOrderIsRejectedWithConflict() throws Exception {
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk());

		mvc.perform(post("/orders").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isConflict());
	}

	@Test
	void listReturnsCreatedOrderAndFiltersByStatus() throws Exception {
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk());

		mvc.perform(get("/orders").param("status", "BOOKED").cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.countByStatus.BOOKED").value(1));
	}
}
