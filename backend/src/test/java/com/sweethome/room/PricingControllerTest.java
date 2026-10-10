package com.sweethome.room;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalTime;
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
 * Kiểm tra PricingController: trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class PricingControllerTest {

	@Mock
	private PricingService pricingService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		PricingController controller = new PricingController(pricingService);
		mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void overviewReturnsData() throws Exception {
		var settings = new PricingSettingsDto(2, LocalTime.of(21, 0), LocalTime.of(12, 0), LocalTime.of(14, 0), LocalTime.of(12, 0));
		var type = new RoomTypeDto(1L, "Tiêu chuẩn", 150000L, 50000L, 350000L, 500000L, List.of("101"));
		when(pricingService.overview()).thenReturn(new PricingOverviewResponse(List.of(type), List.of(), settings));

		mvc.perform(get("/room-types/overview"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.roomTypes[0].name").value("Tiêu chuẩn"))
				.andExpect(jsonPath("$.settings.minHours").value(2));
	}

	@Test
	void updateRejectsEmptyRoomTypeList() throws Exception {
		mvc.perform(put("/room-types/overview").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"roomTypes":[],"settings":{"minHours":2,"overnightCheckIn":"21:00","overnightCheckOut":"12:00","dailyCheckIn":"14:00","dailyCheckOut":"12:00"}}
								"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateRejectsBlankRoomTypeName() throws Exception {
		mvc.perform(put("/room-types/overview").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"roomTypes":[{"id":null,"name":"","twoHourPrice":1,"extraHourPrice":1,"overnightPrice":1,"dailyPrice":1}],
								 "settings":{"minHours":2,"overnightCheckIn":"21:00","overnightCheckOut":"12:00","dailyCheckIn":"14:00","dailyCheckOut":"12:00"}}
								"""))
				.andExpect(status().isBadRequest());
	}
}
