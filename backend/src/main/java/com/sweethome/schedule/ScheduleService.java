package com.sweethome.schedule;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountStatus;
import com.sweethome.common.error.BusinessException;

/**
 * Lịch làm: ca mẫu và xếp ca (business-rules.md mục Lịch làm). Ca đã xếp lưu bản sao giờ/tên/màu nên sửa
 * hoặc xoá ca mẫu không đổi các ca đã xếp. Các ca của cùng một tài khoản không được trùng giờ.
 */
@Service
public class ScheduleService {

	static final String ODD_SHIFT_NAME = "Ca lẻ";
	static final int MAX_RANGE_DAYS = 31;
	private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

	private final ShiftTemplateRepository templateRepository;
	private final WorkShiftRepository shiftRepository;
	private final AccountRepository accountRepository;

	public ScheduleService(ShiftTemplateRepository templateRepository, WorkShiftRepository shiftRepository,
			AccountRepository accountRepository) {
		this.templateRepository = templateRepository;
		this.shiftRepository = shiftRepository;
		this.accountRepository = accountRepository;
	}

	/**
	 * Danh sách ca mẫu theo giờ bắt đầu.
	 *
	 * @return ca mẫu
	 */
	@Transactional(readOnly = true)
	public List<ShiftTemplateDto> listTemplates() {
		return templateRepository.findAllByOrderByStartTimeAsc().stream().map(ShiftTemplateDto::from).toList();
	}

	/**
	 * Thêm ca mẫu.
	 *
	 * @param request dữ liệu ca mẫu
	 * @return ca mẫu vừa thêm
	 */
	@Transactional
	public ShiftTemplateDto createTemplate(ShiftTemplateRequest request) {
		return saveTemplate(new ShiftTemplate(), request);
	}

	/**
	 * Sửa ca mẫu; chỉ áp dụng cho ca xếp sau đó.
	 *
	 * @param id      id ca mẫu
	 * @param request dữ liệu mới
	 * @return ca mẫu sau khi sửa
	 */
	@Transactional
	public ShiftTemplateDto updateTemplate(Long id, ShiftTemplateRequest request) {
		return saveTemplate(findTemplate(id), request);
	}

	/**
	 * Xoá ca mẫu. Ca đã xếp theo mẫu này giữ nguyên (cột template_id về null).
	 *
	 * @param id id ca mẫu
	 */
	@Transactional
	public void deleteTemplate(Long id) {
		ShiftTemplate template = findTemplate(id);
		shiftRepository.detachTemplate(id);
		templateRepository.delete(template);
	}

	/**
	 * Các ca có ngày bắt đầu trong khoảng {@code [from, to)} (tối đa 31 ngày).
	 *
	 * @param from ngày đầu
	 * @param to   ngày cuối (không gồm)
	 * @return ca theo giờ bắt đầu
	 */
	@Transactional(readOnly = true)
	public List<WorkShiftDto> listShifts(LocalDate from, LocalDate to) {
		long days = ChronoUnit.DAYS.between(from, to);
		if (days <= 0 || days > MAX_RANGE_DAYS) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Khoảng ngày không hợp lệ (tối đa 31 ngày)");
		}
		return shiftRepository.findByStartAtGreaterThanEqualAndStartAtLessThan(from.atStartOfDay(), to.atStartOfDay())
				.stream().map(WorkShiftDto::from).toList();
	}

	/**
	 * Xếp một ca (theo mẫu hoặc ca lẻ).
	 *
	 * @param request dữ liệu ca
	 * @return ca vừa xếp
	 */
	@Transactional
	public WorkShiftDto createShift(WorkShiftRequest request) {
		return saveShift(new WorkShift(), request);
	}

	/**
	 * Sửa một ca đã xếp (đổi mẫu, giờ riêng cho ngày đó, ghi chú).
	 *
	 * @param id      id ca
	 * @param request dữ liệu mới
	 * @return ca sau khi sửa
	 */
	@Transactional
	public WorkShiftDto updateShift(Long id, WorkShiftRequest request) {
		return saveShift(findShift(id), request);
	}

	/**
	 * Xoá một ca đã xếp.
	 *
	 * @param id id ca
	 */
	@Transactional
	public void deleteShift(Long id) {
		shiftRepository.delete(findShift(id));
	}

	/**
	 * Sao chép các ca của tuần trước sang tuần bắt đầu {@code weekStart} (+7 ngày). Bỏ qua ca của tài khoản đã
	 * khoá, chưa tới ngày bắt đầu làm, hoặc trùng giờ với ca đã có.
	 *
	 * @param weekStart thứ Hai của tuần đích
	 * @return số ca đã chép / bỏ qua
	 */
	@Transactional
	public WorkShiftDto.CopyResult copyPreviousWeek(LocalDate weekStart) {
		if (weekStart.getDayOfWeek() != DayOfWeek.MONDAY) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Ngày bắt đầu tuần phải là thứ Hai");
		}
		LocalDateTime target = weekStart.atStartOfDay();
		int copied = 0;
		int skipped = 0;
		for (WorkShift source : shiftRepository.findByStartAtGreaterThanEqualAndStartAtLessThan(target.minusDays(7), target)) {
			LocalDateTime startAt = source.getStartAt().plusDays(7);
			LocalDateTime endAt = source.getEndAt().plusDays(7);
			Account account = accountRepository.findById(source.getAccountId()).orElse(null);
			if (account == null || scheduleError(account, startAt.toLocalDate()) != null
					|| shiftRepository.existsOverlap(account.getId(), startAt, endAt, -1L)) {
				skipped++;
				continue;
			}
			WorkShift copy = new WorkShift();
			copy.setAccountId(source.getAccountId());
			copy.setTemplateId(source.getTemplateId());
			copy.setName(source.getName());
			copy.setColor(source.getColor());
			copy.setStartAt(startAt);
			copy.setEndAt(endAt);
			copy.setEdited(source.isEdited());
			copy.setNote(source.getNote());
			shiftRepository.save(copy);
			copied++;
		}
		return new WorkShiftDto.CopyResult(copied, skipped);
	}

	/** Kiểm tra và lưu ca: tài khoản xếp được, bản sao tên/màu theo mẫu, giờ, không trùng ca khác. */
	private WorkShiftDto saveShift(WorkShift shift, WorkShiftRequest request) {
		Account account = accountRepository.findById(request.accountId())
				.orElseThrow(() -> new BusinessException(HttpStatus.BAD_REQUEST, "Tài khoản không tồn tại"));
		String error = scheduleError(account, request.date());
		if (error != null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, error);
		}
		LocalDateTime startAt = request.date().atTime(request.startTime());
		LocalDateTime endAt = endOf(request.date(), request.startTime(), request.endTime());
		long excludeId = shift.getId() == null ? -1L : shift.getId();
		if (shiftRepository.existsOverlap(account.getId(), startAt, endAt, excludeId)) {
			throw new BusinessException(HttpStatus.CONFLICT, "Trùng giờ với ca khác của " + account.getFullName());
		}
		if (request.templateId() == null) {
			shift.setTemplateId(null);
			shift.setName(ODD_SHIFT_NAME);
			shift.setColor(0);
			shift.setEdited(false);
		} else {
			ShiftTemplate template = findTemplate(request.templateId());
			shift.setTemplateId(template.getId());
			shift.setName(template.getName());
			shift.setColor(template.getColor());
			shift.setEdited(!template.getStartTime().equals(request.startTime()) || !template.getEndTime().equals(request.endTime()));
		}
		shift.setAccountId(account.getId());
		shift.setStartAt(startAt);
		shift.setEndAt(endAt);
		shift.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
		return WorkShiftDto.from(shiftRepository.save(shift));
	}

	/** Lý do không xếp ca được cho tài khoản vào ngày đó, null nếu được. */
	private static String scheduleError(Account account, LocalDate date) {
		if (account.getStatus() != AccountStatus.ACTIVE) {
			return "Tài khoản " + account.getFullName() + " đã bị khoá";
		}
		if (account.getStartDate() != null && date.isBefore(account.getStartDate())) {
			return account.getFullName() + " bắt đầu làm từ " + account.getStartDate().format(DATE_FORMAT);
		}
		return null;
	}

	/** Giờ kết thúc thực: giờ kết thúc ≤ giờ bắt đầu nghĩa là sang hôm sau; bằng nhau thì không hợp lệ. */
	static LocalDateTime endOf(LocalDate date, LocalTime start, LocalTime end) {
		if (end.equals(start)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Giờ kết thúc phải khác giờ bắt đầu");
		}
		return end.isAfter(start) ? date.atTime(end) : date.plusDays(1).atTime(end);
	}

	private ShiftTemplateDto saveTemplate(ShiftTemplate template, ShiftTemplateRequest request) {
		if (request.endTime().equals(request.startTime())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Giờ kết thúc phải khác giờ bắt đầu");
		}
		template.setName(request.name().trim());
		template.setStartTime(request.startTime());
		template.setEndTime(request.endTime());
		template.setColor(request.color());
		return ShiftTemplateDto.from(templateRepository.save(template));
	}

	private ShiftTemplate findTemplate(Long id) {
		return templateRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Không tìm thấy ca mẫu"));
	}

	private WorkShift findShift(Long id) {
		return shiftRepository.findById(id).orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Không tìm thấy ca"));
	}
}
