package com.sweethome.schedule;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * API Lịch làm: ca mẫu và ca đã xếp. Xem dành cho mọi vai trò; thêm/sửa/xoá chỉ Quản lý.
 */
@RestController
public class ScheduleController {

	private final ScheduleService scheduleService;

	public ScheduleController(ScheduleService scheduleService) {
		this.scheduleService = scheduleService;
	}

	/** Danh sách ca mẫu. */
	@GetMapping("/shift-templates")
	public List<ShiftTemplateDto> listTemplates() {
		return scheduleService.listTemplates();
	}

	/** Thêm ca mẫu. */
	@PostMapping("/shift-templates")
	@PreAuthorize("hasRole('MANAGER')")
	public ShiftTemplateDto createTemplate(@Valid @RequestBody ShiftTemplateRequest request) {
		return scheduleService.createTemplate(request);
	}

	/** Sửa ca mẫu (chỉ áp dụng cho ca xếp sau đó). */
	@PutMapping("/shift-templates/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public ShiftTemplateDto updateTemplate(@PathVariable Long id, @Valid @RequestBody ShiftTemplateRequest request) {
		return scheduleService.updateTemplate(id, request);
	}

	/** Xoá ca mẫu (ca đã xếp giữ nguyên). */
	@DeleteMapping("/shift-templates/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteTemplate(@PathVariable Long id) {
		scheduleService.deleteTemplate(id);
	}

	/** Các ca có ngày trong khoảng {@code [from, to)}, ví dụ một tuần. */
	@GetMapping("/shifts")
	public List<WorkShiftDto> listShifts(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return scheduleService.listShifts(from, to);
	}

	/** Đơn cần nhân viên đón trong khoảng ngày và đơn nào không có ai trực (chỉ Quản lý). */
	@GetMapping("/shifts/coverage")
	@PreAuthorize("hasRole('MANAGER')")
	public CoverageDto coverage(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return scheduleService.coverage(from, to);
	}

	/** Xếp một ca. */
	@PostMapping("/shifts")
	@PreAuthorize("hasRole('MANAGER')")
	public WorkShiftDto createShift(@Valid @RequestBody WorkShiftRequest request) {
		return scheduleService.createShift(request);
	}

	/** Sửa một ca. */
	@PutMapping("/shifts/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public WorkShiftDto updateShift(@PathVariable Long id, @Valid @RequestBody WorkShiftRequest request) {
		return scheduleService.updateShift(id, request);
	}

	/** Xoá một ca. */
	@DeleteMapping("/shifts/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteShift(@PathVariable Long id) {
		scheduleService.deleteShift(id);
	}

	/** Sao chép ca của tuần trước sang tuần bắt đầu {@code weekStart} (thứ Hai). */
	@PostMapping("/shifts/copy-week")
	@PreAuthorize("hasRole('MANAGER')")
	public WorkShiftDto.CopyResult copyWeek(@Valid @RequestBody CopyWeekRequest request) {
		return scheduleService.copyPreviousWeek(request.weekStart());
	}

	/**
	 * Tuần cần chép ca vào.
	 *
	 * @param weekStart thứ Hai của tuần đích
	 */
	public record CopyWeekRequest(@NotNull(message = "Bắt buộc nhập") LocalDate weekStart) {
	}
}
