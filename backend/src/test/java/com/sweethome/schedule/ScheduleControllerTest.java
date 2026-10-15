package com.sweethome.schedule;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
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
 * Kiểm tra ScheduleController: đọc tham số, trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class ScheduleControllerTest {

	@Mock
	private ScheduleService service;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new ScheduleController(service))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void listTemplatesAndShifts() throws Exception {
		when(service.listTemplates()).thenReturn(List.of(new ShiftTemplateDto(1L, "Sáng", LocalTime.of(6, 0), LocalTime.of(14, 0), 1)));
		when(service.listShifts(LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 19))).thenReturn(List.of());

		mvc.perform(get("/shift-templates")).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Sáng"));
		mvc.perform(get("/shifts").param("from", "2026-10-12").param("to", "2026-10-19")).andExpect(status().isOk());
	}

	@Test
	void createShiftRejectsMissingAccount() throws Exception {
		mvc.perform(post("/shifts").contentType(MediaType.APPLICATION_JSON)
						.content("{\"date\":\"2026-10-12\",\"startTime\":\"06:00\",\"endTime\":\"14:00\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.accountId").exists());
	}

	@Test
	void templateColorOutOfRangeIsBadRequest() throws Exception {
		mvc.perform(put("/shift-templates/1").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Sáng\",\"startTime\":\"06:00\",\"endTime\":\"14:00\",\"color\":9}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void deleteAndCopyWeek() throws Exception {
		when(service.copyPreviousWeek(LocalDate.of(2026, 10, 12))).thenReturn(new WorkShiftDto.CopyResult(3, 1));

		mvc.perform(delete("/shifts/9")).andExpect(status().isNoContent());
		mvc.perform(delete("/shift-templates/2")).andExpect(status().isNoContent());
		mvc.perform(post("/shifts/copy-week").contentType(MediaType.APPLICATION_JSON).content("{\"weekStart\":\"2026-10-12\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.copied").value(3));
		verify(service).deleteShift(9L);
		verify(service).deleteTemplate(2L);
	}
}
