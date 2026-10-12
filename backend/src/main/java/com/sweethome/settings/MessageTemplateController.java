package com.sweethome.settings;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * API mẫu tin nhắn. Xem dành cho mọi vai trò; thêm/sửa/xoá chỉ Quản lý.
 */
@RestController
@RequestMapping("/message-templates")
public class MessageTemplateController {

	private final MessageTemplateService messageTemplateService;

	public MessageTemplateController(MessageTemplateService messageTemplateService) {
		this.messageTemplateService = messageTemplateService;
	}

	@GetMapping
	public List<MessageTemplateDto> list() {
		return messageTemplateService.list();
	}

	@PostMapping
	@PreAuthorize("hasRole('MANAGER')")
	public MessageTemplateDto create(@Valid @RequestBody MessageTemplateUpsertRequest request) {
		return messageTemplateService.create(request);
	}

	@PutMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public MessageTemplateDto update(@PathVariable Long id, @Valid @RequestBody MessageTemplateUpsertRequest request) {
		return messageTemplateService.update(id, request);
	}

	@DeleteMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable Long id) {
		messageTemplateService.delete(id);
	}
}
