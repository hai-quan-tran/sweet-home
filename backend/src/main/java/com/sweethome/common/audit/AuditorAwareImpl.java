package com.sweethome.common.audit;

import java.util.Optional;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.sweethome.auth.JwtService;

/**
 * Lấy tên người dùng đang đăng nhập để ghi vào created_by/updated_by.
 */
@Component
public class AuditorAwareImpl implements AuditorAware<String> {

	/**
	 * @return tên đăng nhập hiện tại, hoặc "system" nếu không có (tác vụ nền, khởi tạo dữ liệu)
	 */
	@Override
	public Optional<String> getCurrentAuditor() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated()) {
			return Optional.of("system");
		}
		// Principal là JwtService.AuthenticatedPrincipal (không phải UserDetails) nên Authentication.getName()
		// mặc định trả về toString() của cả record, quá dài cho cột created_by/updated_by — lấy thẳng username.
		if (auth.getPrincipal() instanceof JwtService.AuthenticatedPrincipal principal) {
			return Optional.of(principal.username());
		}
		return Optional.of("system");
	}
}
