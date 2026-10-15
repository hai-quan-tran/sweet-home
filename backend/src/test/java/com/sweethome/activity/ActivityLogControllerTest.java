package com.sweethome.activity;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.sweethome.common.error.GlobalExceptionHandler;

/**
 * Kiểm tra ActivityLogController: đọc tham số lọc, trả JSON đúng, thiếu {@code from} trả 400.
 */
@ExtendWith(MockitoExtension.class)
class ActivityLogControllerTest {

	@Mock
	private ActivityLogService service;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new ActivityLogController(service))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void searchPassesFiltersAndReturnsItems() throws Exception {
		LocalDateTime from = LocalDateTime.of(2026, 10, 15, 0, 0);
		when(service.search(from, "system", 0, 50)).thenReturn(new ActivityLogDto.Page(List.of(
				new ActivityLogDto(1L, from, "system", null, ActivityAction.STATUS_AUTO, "Tự chuyển sang Đang ở", 30L, "SH-1030", "202")), 1));

		mvc.perform(get("/activity-logs").param("from", "2026-10-15T00:00:00").param("actor", "system"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(1))
				.andExpect(jsonPath("$.items[0].detail").value("Tự chuyển sang Đang ở"));
	}

	@Test
	void blankActorMeansEveryone() throws Exception {
		LocalDateTime from = LocalDateTime.of(2026, 10, 15, 0, 0);
		when(service.search(from, null, 0, 50)).thenReturn(new ActivityLogDto.Page(List.of(), 0));

		mvc.perform(get("/activity-logs").param("from", "2026-10-15T00:00:00").param("actor", ""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").value(0));
	}

	@Test
	void missingFromIsBadRequest() throws Exception {
		mvc.perform(get("/activity-logs")).andExpect(status().isBadRequest());
	}
}
