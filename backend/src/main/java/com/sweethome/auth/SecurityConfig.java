package com.sweethome.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import tools.jackson.databind.ObjectMapper;

/**
 * Cấu hình Spring Security: JWT trong cookie (không dùng session), CSRF theo kiểu double-submit
 * cookie cho SPA, trả lỗi 401/403 dạng ProblemDetail giống GlobalExceptionHandler.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	/** Mã hoá mật khẩu bằng BCrypt. */
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	/**
	 * Khai báo luồng filter: không dùng session, CSRF double-submit cookie (bỏ qua ở login/refresh
	 * vì chưa có cookie CSRF lúc đó), JWT filter đọc access token từ cookie.
	 */
	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtService jwtService, ObjectMapper objectMapper)
			throws Exception {
		CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
		// Mặc định cookie CSRF kế thừa context-path (/api); phải đặt "/" để JS trên các route SPA
		// (/tong-quan, /doi-mat-khau, ...) đọc được document.cookie và gắn header X-XSRF-TOKEN.
		csrfTokenRepository.setCookiePath("/");
		http
				.csrf(csrf -> csrf
						.csrfTokenRepository(csrfTokenRepository)
						.csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
						.ignoringRequestMatchers("/auth/login", "/auth/refresh", "/auth/logout"))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.httpBasic(h -> h.disable())
				.formLogin(f -> f.disable())
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/auth/login", "/auth/refresh", "/auth/logout").permitAll()
						.anyRequest().authenticated())
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint((request, response, authEx) ->
								writeProblem(response, objectMapper, HttpStatus.UNAUTHORIZED, "Chưa đăng nhập hoặc phiên đã hết hạn"))
						.accessDeniedHandler((request, response, deniedEx) ->
								writeProblem(response, objectMapper, HttpStatus.FORBIDDEN, "Không có quyền thực hiện")))
				.addFilterBefore(new JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	private void writeProblem(jakarta.servlet.http.HttpServletResponse response, ObjectMapper objectMapper,
			HttpStatus status, String message) throws java.io.IOException {
		response.setStatus(status.value());
		response.setContentType("application/problem+json");
		ProblemDetail body = ProblemDetail.forStatusAndDetail(status, message);
		response.getWriter().write(objectMapper.writeValueAsString(body));
	}
}
