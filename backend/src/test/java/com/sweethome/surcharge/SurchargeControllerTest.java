package com.sweethome.surcharge;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.sweethome.common.error.GlobalExceptionHandler;

import java.util.List;

/**
 * Kiểm tra SurchargeController: trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class SurchargeControllerTest {

	@Mock
	private SurchargeService surchargeService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		SurchargeController controller = new SurchargeController(surchargeService);
		mvc = MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void listReturnsData() throws Exception {
		var dto = new SurchargeDto(1L, "Quá giờ trả phòng", SurchargeWhenType.OVERSTAY, null, 15, java.util.Set.of(),
				List.of(), List.of(1L), List.of("Tiêu chuẩn"), true);
		when(surchargeService.list()).thenReturn(List.of(dto));

		mvc.perform(get("/surcharges"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].name").value("Quá giờ trả phòng"))
				.andExpect(jsonPath("$[0].graceMinutes").value(15));
	}

	@Test
	void createRejectsBlankName() throws Exception {
		mvc.perform(post("/surcharges").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"name":"","whenType":"MANUAL","amount":200000,"roomTypeIds":[1]}
								"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsEmptyRoomTypeIds() throws Exception {
		mvc.perform(post("/surcharges").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"name":"Hút thuốc trong phòng","whenType":"MANUAL","amount":200000,"roomTypeIds":[]}
								"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsMissingWhenType() throws Exception {
		mvc.perform(post("/surcharges").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"name":"Hút thuốc trong phòng","amount":200000,"roomTypeIds":[1]}
								"""))
				.andExpect(status().isBadRequest());
	}

	@Test
	void setActiveReturnsUpdatedDto() throws Exception {
		var dto = new SurchargeDto(1L, "Hút thuốc trong phòng", SurchargeWhenType.MANUAL, 200000L, null,
				java.util.Set.of(), List.of(), List.of(1L), List.of("Tiêu chuẩn"), false);
		when(surchargeService.setActive(1L, false)).thenReturn(dto);

		mvc.perform(patch("/surcharges/1/active").contentType(MediaType.APPLICATION_JSON)
						.content("{\"active\":false}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.active").value(false));
	}
}
