package com.sweethome.staff;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.sweethome.auth.JwtService;

/**
 * API tài khoản nhân viên. Xem dành cho mọi vai trò; thêm/sửa chỉ Quản lý.
 */
@RestController
@RequestMapping("/accounts")
public class AccountController {

	private final AccountManagementService accountService;

	public AccountController(AccountManagementService accountService) {
		this.accountService = accountService;
	}

	/** Danh sách tài khoản cho màn Nhân viên. */
	@GetMapping
	public List<AccountDto> list() {
		return accountService.list();
	}

	/** Chi tiết một tài khoản, dùng cho màn Sửa nhân viên. */
	@GetMapping("/{id}")
	public AccountDto get(@PathVariable Long id) {
		return accountService.get(id);
	}

	/** Thêm tài khoản. */
	@PostMapping
	@PreAuthorize("hasRole('MANAGER')")
	public AccountDto create(@Valid @RequestBody AccountUpsertRequest request) {
		return accountService.create(request);
	}

	/** Sửa tài khoản: thông tin, vai trò, khoá/mở, đặt lại mật khẩu tạm. */
	@PutMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public AccountDto update(@PathVariable Long id, @Valid @RequestBody AccountUpsertRequest request,
			@AuthenticationPrincipal JwtService.AuthenticatedPrincipal principal) {
		return accountService.update(id, request, principal.accountId());
	}
}
