package com.sweethome.order;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.sweethome.common.error.GlobalExceptionHandler;

/**
 * Kiểm tra OrderController: trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

	@Mock
	private OrderService orderService;
	@Mock
	private OrderPaymentService paymentService;
	@Mock
	private OrderLifecycleService lifecycleService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new OrderController(orderService, paymentService, lifecycleService))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void listReturnsData() throws Exception {
		when(orderService.list(null, null, null, 0, 10))
				.thenReturn(new OrderListResponse(List.of(), 0, java.util.Map.of()));

		mvc.perform(get("/orders"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(0));
	}

	@Test
	void createRejectsMissingRoomId() throws Exception {
		mvc.perform(post("/orders").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"rentalType":"HOURLY","checkInDate":"2026-10-07","checkInTime":"15:00","quantity":3,
								 "guestName":"A","guestPhone":"0900000000","guestCount":2,"source":"ZALO",
								 "checkInMode":"SELF","doorCode":"123456","deposit":50000,"depositMethod":"CASH","discount":0}
								"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsZeroDeposit() throws Exception {
		mvc.perform(post("/orders").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"roomId":1,"rentalType":"HOURLY","checkInDate":"2026-10-07","checkInTime":"15:00",
								 "guestName":"A","guestPhone":"0900000000","guestCount":2,"source":"ZALO",
								 "checkInMode":"SELF","doorCode":"123456","deposit":0,"depositMethod":"CASH","discount":0}
								"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void addPaymentRejectsNonPositiveAmount() throws Exception {
		mvc.perform(post("/orders/1/payments").contentType(MediaType.APPLICATION_JSON)
						.content("{\"amount\":0,\"method\":\"CASH\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void staysParsesRangeParams() throws Exception {
		when(orderService.stays(java.time.LocalDateTime.of(2026, 10, 7, 0, 0), java.time.LocalDateTime.of(2026, 10, 8, 0, 0)))
				.thenReturn(List.of());

		mvc.perform(get("/orders/stays").param("from", "2026-10-07T00:00:00").param("to", "2026-10-08T00:00:00"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isEmpty());
	}

	@Test
	void previewRejectsMissingRentalType() throws Exception {
		mvc.perform(post("/orders/preview").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"roomId":1,"checkInDate":"2026-10-07","checkInTime":"15:00","quantity":3,"guestCount":2}
								"""))
				.andExpect(status().isBadRequest());
	}
}
