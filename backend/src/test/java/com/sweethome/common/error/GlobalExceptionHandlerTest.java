package com.sweethome.common.error;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Kiểm tra GlobalExceptionHandler trả đúng ProblemDetail cho từng loại lỗi.
 */
class GlobalExceptionHandlerTest {

	private MockMvc mvc;

	/** Dựng MockMvc độc lập với controller giả lập ném lỗi. */
	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new FakeController())
				.setControllerAdvice(new GlobalExceptionHandler())
				.build();
	}

	/** Lỗi nghiệp vụ giữ nguyên mã HTTP và thông báo. */
	@Test
	void businessErrorKeepsStatusAndMessage() throws Exception {
		mvc.perform(get("/business"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Phòng đã có đơn"));
	}

	/** Dữ liệu sai trả 400 kèm lỗi theo trường. */
	@Test
	void invalidBodyReturnsFieldErrors() throws Exception {
		mvc.perform(post("/valid").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Dữ liệu không hợp lệ"))
				.andExpect(jsonPath("$.errors.name").value("Bắt buộc nhập"));
	}

	/** Lỗi bất ngờ trả 500 với thông báo chung, không lộ chi tiết kỹ thuật. */
	@Test
	void unexpectedErrorHidesDetails() throws Exception {
		mvc.perform(get("/boom"))
				.andExpect(status().isInternalServerError())
				.andExpect(jsonPath("$.detail").value("Đã có lỗi xảy ra, vui lòng thử lại"));
	}

	/** Lỗi không có quyền (@PreAuthorize) trả 403, không rơi vào handler 500 chung. */
	@Test
	void accessDeniedReturns403() throws Exception {
		mvc.perform(get("/denied"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.detail").value("Không có quyền thực hiện"));
	}

	/** Body dùng cho test kiểm tra dữ liệu. */
	record Body(@NotBlank(message = "Bắt buộc nhập") String name) {
	}

	/** Controller giả lập các tình huống lỗi. */
	@RestController
	static class FakeController {

		/** Ném lỗi nghiệp vụ. */
		@GetMapping("/business")
		void business() {
			throw new BusinessException(HttpStatus.CONFLICT, "Phòng đã có đơn");
		}

		/** Nhận body cần kiểm tra. */
		@PostMapping("/valid")
		void valid(@Valid @RequestBody Body body) {
		}

		/** Ném lỗi không lường trước. */
		@GetMapping("/boom")
		void boom() {
			throw new IllegalStateException("chi tiết nội bộ");
		}

		/** Ném lỗi không có quyền. */
		@GetMapping("/denied")
		void denied() {
			throw new org.springframework.security.access.AccessDeniedException("không có quyền");
		}
	}
}
