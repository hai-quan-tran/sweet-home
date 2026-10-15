package com.sweethome.staff;

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

import com.sweethome.auth.AccountRole;
import com.sweethome.auth.AccountStatus;
import com.sweethome.common.error.GlobalExceptionHandler;

/**
 * Kiểm tra AccountController: trả JSON đúng, lỗi dữ liệu trả 400.
 */
@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

	@Mock
	private AccountManagementService accountService;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.standaloneSetup(new AccountController(accountService))
				.setControllerAdvice(new GlobalExceptionHandler()).build();
	}

	@Test
	void listReturnsData() throws Exception {
		when(accountService.list()).thenReturn(List.of(
				new AccountDto(5L, "hong", "Lê Thị Hồng", "0905218334", null, null, AccountRole.STAFF, AccountStatus.ACTIVE)));

		mvc.perform(get("/accounts"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].fullName").value("Lê Thị Hồng"));
	}

	@Test
	void createRejectsInvalidUsername() throws Exception {
		mvc.perform(post("/accounts").contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"fullName":"Vy","phone":"0978345120","username":"vy nguyễn","password":"Temp1234",
								 "mustChangePassword":true,"role":"STAFF","active":true}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.errors.username").exists());
	}
}
