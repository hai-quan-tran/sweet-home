package com.sweethome.dashboard;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweethome.auth.AccountRole;
import com.sweethome.auth.JwtService;

/**
 * API màn Tổng quan và thông báo trên chuông. Mọi vai trò xem được; doanh thu và thông báo "không ai trực" chỉ trả
 * cho Quản lý.
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

	/** Thông báo hiện tại; "không ai trực" chỉ trả cho Quản lý. */
	@GetMapping("/notifications")
	public NotificationDto notifications(@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal) {
		return dashboardService.notifications(principal.role() == AccountRole.MANAGER);
	}
}
