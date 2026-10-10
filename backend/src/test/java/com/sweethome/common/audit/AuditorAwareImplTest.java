package com.sweethome.common.audit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import com.sweethome.auth.AccountRole;
import com.sweethome.auth.JwtService;

/**
 * Kiểm tra lấy tên người dùng hiện tại để ghi created_by/updated_by.
 */
class AuditorAwareImplTest {

	private final AuditorAwareImpl auditorAware = new AuditorAwareImpl();

	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void returnsSystemWhenNoAuthentication() {
		assertThat(auditorAware.getCurrentAuditor()).contains("system");
	}

	@Test
	void returnsUsernameWhenAuthenticatedViaJwtPrincipal() {
		var principal = new JwtService.AuthenticatedPrincipal(1L, "manager1", AccountRole.MANAGER);
		var auth = new UsernamePasswordAuthenticationToken(principal, null, java.util.List.of());
		SecurityContextHolder.getContext().setAuthentication(auth);

		assertThat(auditorAware.getCurrentAuditor()).contains("manager1");
	}

	@Test
	void returnsSystemWhenPrincipalIsNotJwtPrincipal() {
		// ví dụ: AnonymousAuthenticationToken có principal là chuỗi "anonymousUser", không có username() để lấy
		var auth = new UsernamePasswordAuthenticationToken("anonymousUser", null, java.util.List.of());
		SecurityContextHolder.getContext().setAuthentication(auth);

		assertThat(auditorAware.getCurrentAuditor()).contains("system");
	}
}
