package com.sweethome.room;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API cho tab "Bảng giá": danh sách hạng phòng và khung giờ áp dụng chung.
 */
@RestController
@RequestMapping("/room-types")
public class PricingController {

	private final PricingService pricingService;

	public PricingController(PricingService pricingService) {
		this.pricingService = pricingService;
	}

	/** Xem bảng giá hiện tại (mọi vai trò). */
	@GetMapping("/overview")
	public PricingOverviewResponse overview() {
		return pricingService.overview();
	}

	/** Lưu bảng giá: thêm/sửa/xoá hạng phòng và khung giờ chung (chỉ Quản lý). */
	@PutMapping("/overview")
	@PreAuthorize("hasRole('MANAGER')")
	public PricingOverviewResponse update(@Valid @RequestBody PricingOverviewUpdateRequest request) {
		return pricingService.update(request);
	}
}
