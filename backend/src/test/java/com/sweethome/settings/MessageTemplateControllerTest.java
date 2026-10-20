package com.sweethome.settings;

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
import com.sweethome.room.CheckInMode;

/**
 * Kiểm tra MessageTemplateController: trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class MessageTemplateControllerTest {

	@Mock
	private MessageTemplateService messageTemplateService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new MessageTemplateController(messageTemplateService))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void listReturnsData() throws Exception {
		var dto = new MessageTemplateDto(1L, "Hướng dẫn tự nhận phòng", "Nội dung {ma_cua}", CheckInMode.SELF, true);
		when(messageTemplateService.list()).thenReturn(List.of(dto));

		mvc.perform(get("/message-templates"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].containsDoorCode").value(true));
	}

	@Test
	void createRejectsBlankBody() throws Exception {
		mvc.perform(post("/message-templates").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Mẫu\",\"body\":\"\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createRejectsTooLongBody() throws Exception {
		mvc.perform(post("/message-templates").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Mẫu\",\"body\":\"%s\"}".formatted("a".repeat(2001))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.body").value("Tối đa 2000 ký tự"));
	}
}
