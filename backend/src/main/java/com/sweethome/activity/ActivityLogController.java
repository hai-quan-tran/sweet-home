package com.sweethome.activity;

import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * API nhật ký thao tác. Chỉ Quản lý xem.
 */
@RestController
@RequestMapping("/activity-logs")
public class ActivityLogController {

	private final ActivityLogService activityLogService;

	public ActivityLogController(ActivityLogService activityLogService) {
		this.activityLogService = activityLogService;
	}

	/** Nhật ký từ thời điểm {@code from}, lọc theo người (tên đăng nhập, "system" = Hệ thống). */
	@GetMapping
	@PreAuthorize("hasRole('MANAGER')")
	public ActivityLogDto.Page search(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
			@RequestParam(required = false) String actor,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "50") int size) {
		return activityLogService.search(from, actor == null || actor.isBlank() ? null : actor, page, size);
	}
}
