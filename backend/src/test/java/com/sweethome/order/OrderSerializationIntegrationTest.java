package com.sweethome.order;

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
import com.sweethome.room.RoomRepository;
import com.sweethome.room.RoomTypeRepository;
import com.sweethome.surcharge.SurchargeRepository;

/**
 * Kiểm tra GET /orders và GET /orders/{id} qua request thật (không bọc {@code @Transactional})
 * sau khi tạo đơn có phụ thu áp dụng (collection lazy {@code RentalOrder.surcharges}). Cố ý
 * không dùng {@code @Transactional} như {@link OrderIntegrationTest}: transaction bọc quanh test
 * giữ Session Hibernate mở xuyên suốt, che mất lỗi chỉ lộ ra khi request thật đóng Session giữa
 * hai lần gọi (vì {@code spring.jpa.open-in-view=false}) — đúng lớp lỗi đã gặp ở GĐ3 với
 * {@code SurchargeDto}. Tự dọn dữ liệu đã tạo ở {@link #cleanup()} vì không có rollback tự động.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OrderSerializationIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private RentalOrderRepository orderRepository;
	@Autowired
	private RoomRepository roomRepository;
	@Autowired
	private RoomTypeRepository roomTypeRepository;
	@Autowired
	private SurchargeRepository surchargeRepository;

	private Long accountId;
	private Long orderId;
	private Long roomId;
	private Long roomTypeId;
	private Long surchargeId;

	@AfterEach
	void cleanup() {
		if (orderId != null) {
			orderRepository.deleteById(orderId);
		}
		if (surchargeId != null) {
			surchargeRepository.deleteById(surchargeId);
		}
		if (roomId != null) {
			roomRepository.deleteById(roomId);
		}
		if (roomTypeId != null) {
			roomTypeRepository.deleteById(roomTypeId);
		}
		if (accountId != null) {
			accountRepository.deleteById(accountId);
		}
	}

	@Test
	void getOrdersAfterCreatingOrderWithSurchargeDoesNotFailToSerialize() throws Exception {
		String suffix = String.valueOf(System.nanoTime());

		Account account = new Account();
		account.setUsername("mgr_ords_" + suffix);
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
		String accessToken = cookieValue(loginResult, "access_token");
		String csrf = cookieValue(loginResult, "XSRF-TOKEN");
		MockCookie accessCookie = new MockCookie("access_token", accessToken);
		MockCookie csrfCookie = new MockCookie("XSRF-TOKEN", csrf);

		String pricingPayload = """
				{"roomTypes":[{"id":null,"name":"Tiêu chuẩn %s","twoHourPrice":150000,"extraHourPrice":50000,
				  "overnightPrice":350000,"dailyPrice":500000}],
				 "settings":{"minHours":2,"overnightCheckIn":"21:00","overnightCheckOut":"12:00",
				  "dailyCheckIn":"14:00","dailyCheckOut":"12:00"}}
				""".formatted(suffix);
		MvcResult pricingResult = mvc.perform(put("/room-types/overview").cookie(accessCookie)
						.header("X-XSRF-TOKEN", csrf).cookie(csrfCookie)
						.contentType(MediaType.APPLICATION_JSON).content(pricingPayload))
				.andExpect(status().isOk()).andReturn();
		roomTypeId = ((Number) JsonPath.read(pricingResult.getResponse().getContentAsString(), "$.roomTypes[0].id")).longValue();

		String roomPayload = """
				{"roomNumber":"SR-%s","name":"Phòng test","floor":1,"roomTypeId":%d,"maxGuests":2,
				 "pricingMode":"ROOM_TYPE","defaultCheckInMode":"SELF","acceptingBookings":true}
				""".formatted(suffix, roomTypeId);
		MvcResult roomResult = mvc.perform(post("/rooms").cookie(accessCookie)
						.header("X-XSRF-TOKEN", csrf).cookie(csrfCookie)
						.contentType(MediaType.APPLICATION_JSON).content(roomPayload))
				.andExpect(status().isOk()).andReturn();
		roomId = ((Number) JsonPath.read(roomResult.getResponse().getContentAsString(), "$.id")).longValue();

		String surchargePayload = """
				{"name":"Thêm khách","whenType":"EXTRA_GUEST","amount":50000,"roomTypeIds":[%d]}
				""".formatted(roomTypeId);
		MvcResult surchargeResult = mvc.perform(post("/surcharges").cookie(accessCookie)
						.header("X-XSRF-TOKEN", csrf).cookie(csrfCookie)
						.contentType(MediaType.APPLICATION_JSON).content(surchargePayload))
				.andExpect(status().isOk()).andReturn();
		surchargeId = ((Number) JsonPath.read(surchargeResult.getResponse().getContentAsString(), "$.id")).longValue();

		String orderPayload = """
				{"roomId":%d,"rentalType":"HOURLY","checkInDate":"2026-10-07","checkInTime":"15:00","quantity":3,
				 "guestName":"Phan Thu Trang","guestPhone":"0987654321","guestCount":4,"source":"ZALO",
				 "checkInMode":"SELF","doorCode":"482915","deposit":50000,"depositMethod":"CASH","discount":0}
				""".formatted(roomId);
		MvcResult orderResult = mvc.perform(post("/orders").cookie(accessCookie)
						.header("X-XSRF-TOKEN", csrf).cookie(csrfCookie)
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.surcharges[0].amount").value(2 * 50000))
				.andReturn();
		orderId = ((Number) JsonPath.read(orderResult.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(get("/orders").cookie(accessCookie))
				.andExpect(status().isOk());
		mvc.perform(get("/orders/" + orderId).cookie(accessCookie))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.surcharges[0].name").value("Thêm khách"));
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
