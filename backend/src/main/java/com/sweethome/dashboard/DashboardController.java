package com.sweethome.dashboard;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweethome.auth.AccountRole;
import com.sweethome.auth.JwtService;

/**
 * API màn Tổng quan. Mọi vai trò xem được; doanh thu chỉ trả cho Quản lý.
 */
@RestController
public class DashboardController {

	private final DashboardService dashboardService;

	public DashboardController(DashboardService dashboardService) {
		this.dashboardService = dashboardService;
	}

	/** Số liệu Tổng quan hiện tại. */
	@GetMapping("/dashboard")
	public DashboardDto overview(@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal) {
		return dashboardService.overview(principal.role() == AccountRole.MANAGER);
	}
}
