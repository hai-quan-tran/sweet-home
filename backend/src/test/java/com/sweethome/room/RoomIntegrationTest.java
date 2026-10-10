package com.sweethome.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;

/**
 * Kiểm tra API phòng & bảng giá qua filter chain thật: Quản lý toàn quyền, Nhân viên chỉ xem.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RoomIntegrationTest {

	@Autowired
	private MockMvc mvc;
	@Autowired
	private AccountRepository accountRepository;
	@Autowired
	private PasswordEncoder passwordEncoder;
	@Autowired
	private EntityManager entityManager;

	private String managerAccessToken;
	private String managerCsrf;
	private String staffAccessToken;

	@BeforeEach
	void setUp() throws Exception {
		String suffix = String.valueOf(System.nanoTime());
		managerAccessToken = loginNewAccount("mgr_" + suffix, AccountRole.MANAGER);
		staffAccessToken = loginNewAccount("stf_" + suffix, AccountRole.STAFF);
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

	private String pricingPayload() {
		return """
				{"roomTypes":[{"id":null,"name":"Tiêu chuẩn %s","twoHourPrice":150000,"extraHourPrice":50000,
				  "overnightPrice":350000,"dailyPrice":500000}],
				 "settings":{"minHours":2,"overnightCheckIn":"21:00","overnightCheckOut":"12:00",
				  "dailyCheckIn":"14:00","dailyCheckOut":"12:00"}}
				""".formatted(System.nanoTime());
	}

	@Test
	void managerCanCreatePricingAndRoomThenStaffOnlyReads() throws Exception {
		MvcResult pricingResult = mvc.perform(put("/room-types/overview")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf)
						.cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON)
						.content(pricingPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long roomTypeId = ((Number) JsonPath.read(pricingResult.getResponse().getContentAsString(),
				"$.roomTypes[0].id")).longValue();

		String roomPayload = """
				{"roomNumber":"RT-%s","name":"Phòng test","floor":1,"roomTypeId":%d,"maxGuests":2,
				 "pricingMode":"ROOM_TYPE","defaultCheckInMode":"SELF","acceptingBookings":true}
				""".formatted(System.nanoTime(), roomTypeId);

		mvc.perform(post("/rooms").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(roomPayload))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.effectiveTwoHourPrice").value(150000));

		// Nhân viên xem được danh sách phòng
		mvc.perform(get("/rooms").cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk());

		// Nhưng không được sửa bảng giá hay thêm phòng
		mvc.perform(put("/room-types/overview").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(pricingPayload()))
				.andExpect(status().isForbidden());
		mvc.perform(post("/rooms").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(roomPayload))
				.andExpect(status().isForbidden());
	}

	@Test
	void managerCanUploadAndDeleteRoomPhoto() throws Exception {
		MvcResult pricingResult = mvc.perform(put("/room-types/overview")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(pricingPayload()))
				.andReturn();
		long roomTypeId = ((Number) JsonPath.read(pricingResult.getResponse().getContentAsString(),
				"$.roomTypes[0].id")).longValue();
		String roomPayload = """
				{"roomNumber":"PH-%s","name":"Phòng ảnh","floor":1,"roomTypeId":%d,"maxGuests":2,
				 "pricingMode":"ROOM_TYPE","defaultCheckInMode":"SELF","acceptingBookings":true}
				""".formatted(System.nanoTime(), roomTypeId);
		MvcResult roomResult = mvc.perform(post("/rooms").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(roomPayload))
				.andReturn();
		long roomId = ((Number) JsonPath.read(roomResult.getResponse().getContentAsString(), "$.id"))
				.longValue();
		// Đọc room.getPhotos() lúc tạo phòng (rỗng) đã nạp sẵn collection rỗng vào persistence context
		// của transaction test (1 session dùng chung cho cả test); phải clear để lần đọc tiếp theo
		// truy vấn lại từ DB thay vì dùng bản rỗng còn nhớ trong bộ nhớ.
		entityManager.clear();

		MockMultipartFile file = new MockMultipartFile("files", "a.png", "image/png",
				new byte[] { (byte) 0x89, 'P', 'N', 'G' });
		MvcResult uploadResult = mvc.perform(multipart("/rooms/" + roomId + "/photos")
						.file(file)
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf)))
				.andExpect(status().isOk())
				.andReturn();
		long photoId = ((Number) JsonPath.read(uploadResult.getResponse().getContentAsString(),
				"$.photos[0].id")).longValue();

		mvc.perform(get("/room-photos/" + photoId).cookie(new MockCookie("access_token", managerAccessToken)))
				.andExpect(status().isOk());

		mvc.perform(delete("/rooms/" + roomId + "/photos/" + photoId)
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf)))
				.andExpect(status().isOk());
		mvc.perform(get("/room-photos/" + photoId).cookie(new MockCookie("access_token", managerAccessToken)))
				.andExpect(status().isNotFound());

		assertThat(photoId).isPositive();
	}
}
