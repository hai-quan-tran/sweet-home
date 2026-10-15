package com.sweethome.schedule;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountStatus;
import com.sweethome.common.error.BusinessException;
import com.sweethome.order.OrderDto;
import com.sweethome.order.RentalOrder;
import com.sweethome.order.RentalOrderRepository;

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
	private final RentalOrderRepository orderRepository;
	private final Clock clock;

	public ScheduleService(ShiftTemplateRepository templateRepository, WorkShiftRepository shiftRepository,
			AccountRepository accountRepository, RentalOrderRepository orderRepository, Clock clock) {
		this.templateRepository = templateRepository;
		this.shiftRepository = shiftRepository;
		this.accountRepository = accountRepository;
		this.orderRepository = orderRepository;
		this.clock = clock;
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
		checkRange(from, to);
		return shiftRepository.findByStartAtGreaterThanEqualAndStartAtLessThan(from.atStartOfDay(), to.atStartOfDay())
				.stream().map(WorkShiftDto::from).toList();
	}

	/**
	 * Đơn cần nhân viên đón có giờ nhận phòng trong {@code [from, to)} và đơn nào không có ai trực lúc đó
	 * (giờ nhận phòng không nằm trong ca nào của tài khoản đang hoạt động).
	 *
	 * @param from ngày đầu
	 * @param to   ngày cuối (không gồm), tối đa 31 ngày
	 * @return số đơn / số đơn không ai trực theo ngày, kèm danh sách đơn không ai trực
	 */
	@Transactional(readOnly = true)
	public CoverageDto coverage(LocalDate from, LocalDate to) {
		checkRange(from, to);
		Set<Long> active = accountRepository.findAll().stream().filter(a -> a.getStatus() == AccountStatus.ACTIVE)
				.map(Account::getId).collect(Collectors.toSet());
		List<WorkShift> shifts = shiftRepository.findOverlapping(from.atStartOfDay(), to.atStartOfDay()).stream()
				.filter(s -> active.contains(s.getAccountId())).toList();
		Map<LocalDate, int[]> perDay = new TreeMap<>();
		from.datesUntil(to).forEach(d -> perDay.put(d, new int[2]));
		List<CoverageDto.UncoveredOrder> uncovered = new ArrayList<>();
		for (RentalOrder order : orderRepository.findStaffPickupsBetween(from.atStartOfDay(), to.atStartOfDay())) {
			int[] counts = perDay.get(order.getCheckInAt().toLocalDate());
			counts[0]++;
			boolean covered = shifts.stream().anyMatch(s -> !s.getStartAt().isAfter(order.getCheckInAt())
					&& s.getEndAt().isAfter(order.getCheckInAt()));
			if (!covered) {
				counts[1]++;
				uncovered.add(new CoverageDto.UncoveredOrder(order.getId(), OrderDto.codeOf(order.getId()),
						order.getRoom().getRoomNumber(), order.getCheckInAt()));
			}
		}
		return new CoverageDto(perDay.entrySet().stream()
				.map(e -> new CoverageDto.Day(e.getKey(), e.getValue()[0], e.getValue()[1])).toList(), uncovered);
	}

	/**
	 * Nhân viên được xem mã cửa của đơn khi đang trong ca, hoặc thời gian ở của đơn giao với một ca của mình.
	 *
	 * @param accountId tài khoản Nhân viên
	 * @param stayFrom  giờ nhận phòng của đơn
	 * @param stayTo    giờ trả phòng của đơn
	 * @return true nếu được xem
	 */
	@Transactional(readOnly = true)
	public boolean canSeeDoorCode(Long accountId, LocalDateTime stayFrom, LocalDateTime stayTo) {
		LocalDateTime now = LocalDateTime.now(clock);
		return shiftRepository.existsForAccountBetween(accountId, now, now.plusSeconds(1))
				|| shiftRepository.existsForAccountBetween(accountId, stayFrom, stayTo);
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

	/** Khoảng ngày hợp lệ: to sau from, tối đa 31 ngày. */
	private static void checkRange(LocalDate from, LocalDate to) {
		long days = ChronoUnit.DAYS.between(from, to);
		if (days <= 0 || days > MAX_RANGE_DAYS) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Khoảng ngày không hợp lệ (tối đa 31 ngày)");
		}
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
