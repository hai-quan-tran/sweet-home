package com.sweethome.settings;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API thông tin homestay. Xem dành cho mọi vai trò; sửa chỉ Quản lý.
 */
@RestController
@RequestMapping("/settings/homestay")
public class HomestayController {

	private final HomestayService homestayService;

	public HomestayController(HomestayService homestayService) {
		this.homestayService = homestayService;
	}

	@GetMapping
	public HomestayInfoDto get() {
		return homestayService.get();
	}

	@PutMapping
	@PreAuthorize("hasRole('MANAGER')")
	public HomestayInfoDto update(@Valid @RequestBody HomestayInfoUpdateRequest request) {
		return homestayService.update(request);
	}
}
