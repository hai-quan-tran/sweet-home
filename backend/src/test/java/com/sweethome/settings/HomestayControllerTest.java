package com.sweethome.settings;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

/**
 * Kiểm tra HomestayController: trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class HomestayControllerTest {

	@Mock
	private HomestayService homestayService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new HomestayController(homestayService))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void getReturnsData() throws Exception {
		when(homestayService.get()).thenReturn(new HomestayInfoDto("Sweet Home", "0909123456", "Địa chỉ", null, null, null));

		mvc.perform(get("/settings/homestay"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Sweet Home"));
	}

	@Test
	void updateRejectsBlankName() throws Exception {
		mvc.perform(put("/settings/homestay").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"\",\"hotline\":\"0909\",\"address\":\"A\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void updateRejectsTooLongHotline() throws Exception {
		mvc.perform(put("/settings/homestay").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Sweet Home\",\"hotline\":\"%s\",\"address\":\"A\"}".formatted("0".repeat(31))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.hotline").value("Tối đa 30 ký tự"));
	}
}
