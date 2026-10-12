package com.sweethome.surcharge;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API quản lý phụ thu. Xem dành cho mọi vai trò; thêm/sửa/ẩn-khôi phục chỉ Quản lý.
 */
@RestController
@RequestMapping("/surcharges")
public class SurchargeController {

	private final SurchargeService surchargeService;

	public SurchargeController(SurchargeService surchargeService) {
		this.surchargeService = surchargeService;
	}

	/** Danh sách phụ thu (gồm đã ẩn) cho tab "Phụ thu". */
	@GetMapping
	public List<SurchargeDto> list() {
		return surchargeService.list();
	}

	/** Thêm phụ thu mới. */
	@PostMapping
	@PreAuthorize("hasRole('MANAGER')")
	public SurchargeDto create(@Valid @RequestBody SurchargeUpsertRequest request) {
		return surchargeService.create(request);
	}

	/** Sửa phụ thu. */
	@PutMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public SurchargeDto update(@PathVariable Long id, @Valid @RequestBody SurchargeUpsertRequest request) {
		return surchargeService.update(id, request);
	}

	/** Ẩn hoặc khôi phục một phụ thu. */
	@PatchMapping("/{id}/active")
	@PreAuthorize("hasRole('MANAGER')")
	public SurchargeDto setActive(@PathVariable Long id, @RequestBody SurchargeActiveRequest request) {
		return surchargeService.setActive(id, request.active());
	}
}
