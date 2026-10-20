package com.sweethome.order;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
 * Kiểm tra API đơn thuê qua filter chain thật: Quản lý và Nhân viên đều tạo/xem/thu tiền được,
 * chỉ Quản lý sửa/xoá khoản đã thu.
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
	@Autowired
	private OrderLifecycleService lifecycleService;
	@Autowired
	private OrderExtensionService extensionService;

	private String managerAccessToken;
	private String managerCsrf;
	private String staffAccessToken;
	private String staffCsrf;
	private long roomId;
	private long roomTypeId;

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
		roomTypeId = ((Number) JsonPath.read(pricingResult.getResponse().getContentAsString(), "$.roomTypes[0].id")).longValue();
		return postRoom("RO-" + suffix);
	}

	/** Thêm phòng mới thuộc hạng phòng đã tạo ở {@link #createRoom}. */
	private long postRoom(String roomNumber) throws Exception {
		String roomPayload = """
				{"roomNumber":"%s","name":"Phòng test","floor":1,"roomTypeId":%d,"maxGuests":2,
				 "pricingMode":"ROOM_TYPE","defaultCheckInMode":"SELF","acceptingBookings":true}
				""".formatted(roomNumber, roomTypeId);
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

		// Nhân viên chưa có ca giao với đơn (và không đang trong ca) → không xem được mã cửa
		mvc.perform(get("/orders/" + orderId + "/door-code").cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isForbidden());
		MvcResult me = mvc.perform(get("/auth/me").cookie(new MockCookie("access_token", staffAccessToken))).andReturn();
		long staffId = ((Number) JsonPath.read(me.getResponse().getContentAsString(), "$.id")).longValue();
		mvc.perform(post("/shifts")
						.cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"accountId\":%d,\"date\":\"2026-10-07\",\"startTime\":\"14:00\",\"endTime\":\"22:00\"}".formatted(staffId)))
				.andExpect(status().isOk());
		mvc.perform(get("/orders/" + orderId + "/door-code").cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.doorCode").value("482915"));
	}

	@Test
	void staysOfDayIncludeCreatedOrderOnItsRoom() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(get("/orders/stays").param("from", "2026-10-07T00:00:00").param("to", "2026-10-08T00:00:00")
						.cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.orderId == %d)].roomId".formatted(orderId)).value((int) roomId))
				.andExpect(jsonPath("$[?(@.orderId == %d)].startAt".formatted(orderId)).value("2026-10-07T15:00:00"));
		mvc.perform(get("/orders/stays").param("from", "2026-10-08T00:00:00").param("to", "2026-10-09T00:00:00")
						.cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.orderId == %d)]".formatted(orderId)).isEmpty());
	}

	@Test
	void staffExtendsStayUntilOneHourBeforeNextOrder() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
		// Đơn sau nhận phòng 20:00 → đơn 15:00–18:00 chỉ gia hạn được đến 19:00
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload().replace("\"15:00\"", "\"20:00\"")))
				.andExpect(status().isOk());
		mvc.perform(post("/orders/" + orderId + "/check-in").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isOk());

		mvc.perform(post("/orders/" + orderId + "/extend/preview").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"HOUR\",\"quantity\":2,\"collectNow\":false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(false))
				.andExpect(jsonPath("$.maxCheckOutAt").value("2026-10-07T19:00:00"));
		mvc.perform(post("/orders/" + orderId + "/extend").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"HOUR\",\"quantity\":2,\"collectNow\":false}"))
				.andExpect(status().isConflict());
		mvc.perform(post("/orders/" + orderId + "/extend").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"type\":\"HOUR\",\"quantity\":1,\"collectNow\":true,\"paymentMethod\":\"CASH\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.checkOutAt").value("2026-10-07T19:00:00"))
				.andExpect(jsonPath("$.surcharges[0].name").value("Gia hạn +1 giờ"))
				.andExpect(jsonPath("$.payments[0].amount").value(50000));
		mvc.perform(get("/orders/stays").param("from", "2026-10-07T00:00:00").param("to", "2026-10-08T00:00:00")
						.cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(jsonPath("$[?(@.orderId == %d)].endAt".formatted(orderId)).value("2026-10-07T19:00:00"));
	}

	@Test
	void extendMovesGuestToSamePriceRoomThenOldRoomNeedsCleaning() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload().replace("\"15:00\"", "\"19:00\"")))
				.andExpect(status().isOk());
		mvc.perform(post("/orders/" + orderId + "/check-in").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isOk());
		long otherRoomId = postRoom("RO2-" + System.nanoTime());
		String extendTwoHours = "{\"type\":\"HOUR\",\"quantity\":2,\"collectNow\":false,\"targetRoomId\":%d}";

		mvc.perform(post("/orders/" + orderId + "/extend/preview").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"HOUR\",\"quantity\":2,\"collectNow\":false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(false))
				.andExpect(jsonPath("$.moveOptions[?(@.roomId == %d)]".formatted(otherRoomId)).isNotEmpty());
		mvc.perform(post("/orders/" + orderId + "/extend").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(extendTwoHours.formatted(otherRoomId)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.roomId").value((int) otherRoomId))
				.andExpect(jsonPath("$.checkOutAt").value("2026-10-07T20:00:00"))
				.andExpect(jsonPath("$.stays.length()").value(2));
		mvc.perform(get("/orders/stays").param("from", "2026-10-07T00:00:00").param("to", "2026-10-08T00:00:00")
						.cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(jsonPath("$[?(@.orderId == %d)].roomId".formatted(orderId)).value(org.hamcrest.Matchers.contains((int) roomId, (int) otherRoomId)));

		extensionService.releaseMovedOutRooms();
		mvc.perform(get("/rooms/" + roomId).cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(jsonPath("$.needsCleaning").value(true));
		mvc.perform(get("/rooms/" + otherRoomId).cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(jsonPath("$.needsCleaning").value(false));
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
	void roomWithGuestNotCheckedOutIsBusyUntilOneHourFromNow() throws Exception {
		// Đơn khách tự check-in 07/10 đã qua giờ trả → Chờ xác nhận trả, khách vẫn trong phòng
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk());
		// Đơn đang ở phòng khác cùng giá, phòng đó có khách kế tiếp lúc 19:00 → gia hạn phải chuyển phòng
		long otherRoomId = postRoom("RO2-" + System.nanoTime());
		String otherRoomStaffOrder = orderPayload().replace("\"roomId\":" + roomId, "\"roomId\":" + otherRoomId)
				.replace("\"SELF\"", "\"STAFF\"");
		MvcResult staying = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(otherRoomStaffOrder))
				.andExpect(status().isOk())
				.andReturn();
		long stayingId = ((Number) JsonPath.read(staying.getResponse().getContentAsString(), "$.id")).longValue();
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(otherRoomStaffOrder.replace("\"15:00\"", "\"19:00\"")))
				.andExpect(status().isOk());
		mvc.perform(post("/orders/" + stayingId + "/check-in").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isOk());
		lifecycleService.advanceStatuses();

		mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload().replace("2026-10-07", "2026-10-08")))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.endsWith("chưa trả phòng")));
		mvc.perform(post("/orders/" + stayingId + "/extend/preview").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"type\":\"HOUR\",\"quantity\":2,\"collectNow\":false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.available").value(false))
				.andExpect(jsonPath("$.moveOptions[?(@.roomId == %d)]".formatted(roomId)).isEmpty());
		// Đặt cho giờ sau mốc bây giờ + 1 tiếng vẫn được
		mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON)
						.content(orderPayload().replace("2026-10-07", java.time.LocalDate.now().plusDays(2).toString())))
				.andExpect(status().isOk());
	}

	@Test
	void movingOrderToAnotherTimeFreesTheOldSlot() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(put("/orders/" + orderId).cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload().replace("\"15:00\"", "\"19:00\"")))
				.andExpect(status().isOk());

		mvc.perform(post("/orders").cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk());
	}

	@Test
	void staffCanCollectPaymentButOnlyManagerCanEditOrDeleteIt() throws Exception {
		MvcResult createResult = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(createResult.getResponse().getContentAsString(), "$.id")).longValue();

		MvcResult payResult = mvc.perform(post("/orders/" + orderId + "/payments")
						.cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"amount\":100000,\"method\":\"CASH\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paidAmount").value(150000))
				.andExpect(jsonPath("$.dueAmount").value(50000))
				.andExpect(jsonPath("$.payments[0].createdBy").isNotEmpty())
				.andReturn();
		long paymentId = ((Number) JsonPath.read(payResult.getResponse().getContentAsString(), "$.payments[0].id")).longValue();
		String paymentUrl = "/orders/" + orderId + "/payments/" + paymentId;

		mvc.perform(put(paymentUrl).cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"amount\":50000,\"method\":\"CASH\"}"))
				.andExpect(status().isForbidden());
		mvc.perform(delete(paymentUrl).cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isForbidden());

		mvc.perform(put(paymentUrl).cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"amount\":50000,\"method\":\"TRANSFER\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paidAmount").value(100000));
		mvc.perform(delete(paymentUrl).cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.payments").isEmpty());
	}

	@Test
	void staffCheckInAndAutoTransitionOfPastSelfCheckInOrder() throws Exception {
		MvcResult staffOrder = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON)
						.content(orderPayload().replace("\"SELF\"", "\"STAFF\"").replace("2026-10-07", "2026-10-08")))
				.andExpect(status().isOk())
				.andReturn();
		long staffOrderId = ((Number) JsonPath.read(staffOrder.getResponse().getContentAsString(), "$.id")).longValue();
		mvc.perform(post("/orders/" + staffOrderId + "/check-in").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CHECKED_IN"))
				.andExpect(jsonPath("$.actualCheckInAt").isNotEmpty());

		MvcResult selfOrder = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long selfOrderId = ((Number) JsonPath.read(selfOrder.getResponse().getContentAsString(), "$.id")).longValue();
		lifecycleService.advanceStatuses();
		mvc.perform(get("/orders/" + selfOrderId).cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(jsonPath("$.status").value("PENDING_CHECKOUT"))
				.andExpect(jsonPath("$.actualCheckInAt").value("2026-10-07T15:00:00"));
	}

	@Test
	void staffChecksOutCollectingDueThenMarksRoomCleaned() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload().replace("\"SELF\"", "\"STAFF\"")))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
		mvc.perform(post("/orders/" + orderId + "/check-in").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isOk());

		String checkout = """
				{"actualCheckInAt":"2026-10-07T15:00:00","actualCheckOutAt":"2026-10-07T18:00:00","paymentMethod":"CASH"}
				""";
		mvc.perform(post("/orders/" + orderId + "/checkout/preview").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(checkout))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.dueAmount").value(150000));
		mvc.perform(post("/orders/" + orderId + "/checkout").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(checkout))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CHECKED_OUT"))
				.andExpect(jsonPath("$.dueAmount").value(0));

		mvc.perform(get("/rooms/" + roomId).cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(jsonPath("$.needsCleaning").value(true));
		mvc.perform(post("/rooms/" + roomId + "/cleaned").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.needsCleaning").value(false));
	}

	@Test
	void staffCannotEditRefundButManagerCanCancelWithReason() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();
		String cancelUrl = "/orders/" + orderId + "/cancel";

		// đơn 07/10 đã qua giờ nhận → mức hoàn mặc định 0
		mvc.perform(get(cancelUrl + "/preview").cookie(new MockCookie("access_token", staffAccessToken)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.refundPercent").value(0));
		mvc.perform(post(cancelUrl).cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"refundAmount\":10000,\"reason\":\"x\"}"))
				.andExpect(status().isForbidden());
		mvc.perform(post(cancelUrl).cookie(new MockCookie("access_token", managerAccessToken))
						.header("X-XSRF-TOKEN", managerCsrf).cookie(new MockCookie("XSRF-TOKEN", managerCsrf))
						.contentType(MediaType.APPLICATION_JSON).content("{\"refundAmount\":10000,\"reason\":\"Khách quen\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CANCELLED"))
				.andExpect(jsonPath("$.refundAmount").value(10000));
	}

	@Test
	void staffEditsGuestInfoButCannotChangeDeposit() throws Exception {
		MvcResult created = mvc.perform(post("/orders").cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload()))
				.andExpect(status().isOk())
				.andReturn();
		long orderId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

		mvc.perform(put("/orders/" + orderId).cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON)
						.content(orderPayload().replace("Phan Thu Trang", "Phan Thu Hà").replace("\"482915\"", "\"\"")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.guestName").value("Phan Thu Hà"))
				.andExpect(jsonPath("$.hasDoorCode").value(true));
		mvc.perform(put("/orders/" + orderId).cookie(new MockCookie("access_token", staffAccessToken))
						.header("X-XSRF-TOKEN", staffCsrf).cookie(new MockCookie("XSRF-TOKEN", staffCsrf))
						.contentType(MediaType.APPLICATION_JSON).content(orderPayload().replace("\"deposit\":50000", "\"deposit\":60000")))
				.andExpect(status().isForbidden());
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
