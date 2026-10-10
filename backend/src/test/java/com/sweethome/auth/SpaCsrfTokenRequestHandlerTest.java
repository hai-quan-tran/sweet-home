package com.sweethome.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.DefaultCsrfToken;

/**
 * Kiểm tra CSRF token được ghi ngay (eager) và ưu tiên header khi đọc giá trị gửi lên.
 */
class SpaCsrfTokenRequestHandlerTest {

	private final SpaCsrfTokenRequestHandler handler = new SpaCsrfTokenRequestHandler();
	private final DefaultCsrfToken token = new DefaultCsrfToken("X-XSRF-TOKEN", "_csrf", "token-value");

	@Test
	void handleResolvesTokenEagerly() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		boolean[] resolved = { false };

		handler.handle(request, response, () -> {
			resolved[0] = true;
			return token;
		});

		assertThat(resolved[0]).isTrue();
	}

	@Test
	void resolveUsesHeaderValueWhenPresent() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.addHeader("X-XSRF-TOKEN", "from-header");

		assertThat(handler.resolveCsrfTokenValue(request, token)).isEqualTo("from-header");
	}

	@Test
	void resolveFallsBackToParameterWhenHeaderMissing() {
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setParameter("_csrf", "from-param");

		assertThat(handler.resolveCsrfTokenValue(request, token)).isEqualTo("from-param");
	}
}
