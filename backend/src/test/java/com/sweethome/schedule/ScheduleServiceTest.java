package com.sweethome.schedule;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountStatus;
import com.sweethome.common.error.BusinessException;
import com.sweethome.order.RentalOrder;
import com.sweethome.order.RentalOrderRepository;
import com.sweethome.room.Room;

/**
 * Kiểm tra ca mẫu và xếp ca: bản sao theo mẫu, ca đêm sang hôm sau, cờ đã sửa giờ, chặn trùng giờ,
 * tài khoản khoá / chưa tới ngày bắt đầu làm, sao chép tuần trước.
 */
@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

	private static final LocalDate FRIDAY = LocalDate.of(2026, 10, 9);
	private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

	@Mock
	private ShiftTemplateRepository templateRepository;
	@Mock
	private WorkShiftRepository shiftRepository;
	@Mock
	private AccountRepository accountRepository;
	@Mock
	private RentalOrderRepository orderRepository;

	private ScheduleService service;
	private Account hong;
	private ShiftTemplate morning;
	private ShiftTemplate night;

	@BeforeEach
	void setUp() {
		service = new ScheduleService(templateRepository, shiftRepository, accountRepository, orderRepository,
				Clock.fixed(FRIDAY.atTime(10, 0).atZone(ZONE).toInstant(), ZONE));
		hong = new Account();
		setId(Account.class, hong, 5L);
		hong.setFullName("Lê Thị Hồng");
		morning = template(1L, "Sáng", 6, 14, 1);
		night = template(3L, "Đêm", 22, 6, 3);
		lenient().when(accountRepository.findById(5L)).thenReturn(Optional.of(hong));
		lenient().when(templateRepository.findById(1L)).thenReturn(Optional.of(morning));
		lenient().when(templateRepository.findById(3L)).thenReturn(Optional.of(night));
		lenient().when(shiftRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	@Test
	void shiftFromTemplateCopiesNameColorAndIsNotEdited() {
		WorkShiftDto dto = service.createShift(new WorkShiftRequest(5L, FRIDAY, 1L, LocalTime.of(6, 0), LocalTime.of(14, 0), " "));

		assertThat(dto.name()).isEqualTo("Sáng");
		assertThat(dto.color()).isEqualTo(1);
		assertThat(dto.edited()).isFalse();
		assertThat(dto.note()).isNull();
		assertThat(dto.endAt()).isEqualTo(FRIDAY.atTime(14, 0));
	}

	@Test
	void nightShiftEndsNextDayAndChangedTimeIsEdited() {
		WorkShiftDto dto = service.createShift(new WorkShiftRequest(5L, FRIDAY, 3L, LocalTime.of(22, 0), LocalTime.of(5, 0), "Về sớm"));

		assertThat(dto.startAt()).isEqualTo(FRIDAY.atTime(22, 0));
		assertThat(dto.endAt()).isEqualTo(FRIDAY.plusDays(1).atTime(5, 0));
		assertThat(dto.edited()).isTrue();
		assertThat(dto.note()).isEqualTo("Về sớm");
	}

	@Test
	void oddShiftHasNoTemplate() {
		WorkShiftDto dto = service.createShift(new WorkShiftRequest(5L, FRIDAY, null, LocalTime.of(18, 0), LocalTime.of(0, 0), null));

		assertThat(dto.name()).isEqualTo("Ca lẻ");
		assertThat(dto.color()).isZero();
		assertThat(dto.templateId()).isNull();
		assertThat(dto.endAt()).isEqualTo(FRIDAY.plusDays(1).atStartOfDay());
	}

	@Test
	void sameStartAndEndIsRejected() {
		assertThatThrownBy(() -> service.createShift(new WorkShiftRequest(5L, FRIDAY, null, LocalTime.of(8, 0), LocalTime.of(8, 0), null)))
				.isInstanceOf(BusinessException.class).hasMessage("Giờ kết thúc phải khác giờ bắt đầu");
	}

	@Test
	void overlappingShiftIsRejected() {
		when(shiftRepository.existsOverlap(5L, FRIDAY.atTime(6, 0), FRIDAY.atTime(14, 0), -1L)).thenReturn(true);

		assertThatThrownBy(() -> service.createShift(new WorkShiftRequest(5L, FRIDAY, 1L, LocalTime.of(6, 0), LocalTime.of(14, 0), null)))
				.isInstanceOf(BusinessException.class).hasMessageContaining("Trùng giờ");
	}

	@Test
	void updateExcludesItselfFromOverlapCheck() {
		WorkShift existing = new WorkShift();
		setId(WorkShift.class, existing, 9L);
		when(shiftRepository.findById(9L)).thenReturn(Optional.of(existing));

		service.updateShift(9L, new WorkShiftRequest(5L, FRIDAY, 1L, LocalTime.of(6, 0), LocalTime.of(12, 0), null));

		verify(shiftRepository).existsOverlap(5L, FRIDAY.atTime(6, 0), FRIDAY.atTime(12, 0), 9L);
		assertThat(existing.isEdited()).isTrue();
	}

	@Test
	void lockedAccountOrBeforeStartDateCannotBeScheduled() {
		hong.setStartDate(MONDAY);
		assertThatThrownBy(() -> service.createShift(new WorkShiftRequest(5L, FRIDAY, 1L, LocalTime.of(6, 0), LocalTime.of(14, 0), null)))
				.isInstanceOf(BusinessException.class).hasMessage("Lê Thị Hồng bắt đầu làm từ 12/10/2026");

		hong.setStatus(AccountStatus.LOCKED);
		assertThatThrownBy(() -> service.createShift(new WorkShiftRequest(5L, MONDAY, 1L, LocalTime.of(6, 0), LocalTime.of(14, 0), null)))
				.isInstanceOf(BusinessException.class).hasMessageContaining("đã bị khoá");
	}

	@Test
	void unknownTemplateIsNotFound() {
		when(templateRepository.findById(7L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.createShift(new WorkShiftRequest(5L, FRIDAY, 7L, LocalTime.of(6, 0), LocalTime.of(14, 0), null)))
				.isInstanceOf(BusinessException.class).hasMessage("Không tìm thấy ca mẫu");
	}

	@Test
	void copyPreviousWeekShiftsSevenDaysAndSkipsConflicts() {
		WorkShift ok = shift(5L, FRIDAY.atTime(6, 0), FRIDAY.atTime(14, 0));
		WorkShift clash = shift(5L, FRIDAY.plusDays(1).atTime(6, 0), FRIDAY.plusDays(1).atTime(14, 0));
		WorkShift unknownAccount = shift(99L, FRIDAY.atTime(6, 0), FRIDAY.atTime(14, 0));
		when(shiftRepository.findByStartAtGreaterThanEqualAndStartAtLessThan(MONDAY.minusDays(7).atStartOfDay(), MONDAY.atStartOfDay()))
				.thenReturn(List.of(ok, clash, unknownAccount));
		lenient().when(shiftRepository.existsOverlap(eq(5L), eq(FRIDAY.plusDays(8).atTime(6, 0)), any(), anyLong())).thenReturn(true);

		WorkShiftDto.CopyResult result = service.copyPreviousWeek(MONDAY);

		assertThat(result.copied()).isEqualTo(1);
		assertThat(result.skipped()).isEqualTo(2);
		verify(shiftRepository, times(1)).save(org.mockito.ArgumentMatchers.argThat(s ->
				s.getStartAt().equals(FRIDAY.plusDays(7).atTime(6, 0)) && s.getName().equals("Sáng") && s.getColor() == 1));
	}

	@Test
	void copyWeekRequiresMonday() {
		assertThatThrownBy(() -> service.copyPreviousWeek(FRIDAY)).isInstanceOf(BusinessException.class);
		verify(shiftRepository, never()).save(any());
	}

	@Test
	void listShiftsLimitsRange() {
		assertThatThrownBy(() -> service.listShifts(MONDAY, MONDAY)).isInstanceOf(BusinessException.class);
		assertThatThrownBy(() -> service.listShifts(MONDAY, MONDAY.plusDays(32))).isInstanceOf(BusinessException.class);
		when(shiftRepository.findByStartAtGreaterThanEqualAndStartAtLessThan(MONDAY.atStartOfDay(), MONDAY.plusDays(7).atStartOfDay()))
				.thenReturn(List.of(shift(5L, MONDAY.atTime(6, 0), MONDAY.atTime(14, 0))));

		assertThat(service.listShifts(MONDAY, MONDAY.plusDays(7))).hasSize(1);
	}

	@Test
	void templatesCrud() {
		when(templateRepository.findAllByOrderByStartTimeAsc()).thenReturn(List.of(morning, night));
		when(templateRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.listTemplates()).extracting(ShiftTemplateDto::name).containsExactly("Sáng", "Đêm");
		assertThat(service.createTemplate(new ShiftTemplateRequest(" Gãy ", LocalTime.of(10, 0), LocalTime.of(15, 0), 4)).name())
				.isEqualTo("Gãy");
		assertThat(service.updateTemplate(1L, new ShiftTemplateRequest("Sáng", LocalTime.of(7, 0), LocalTime.of(15, 0), 1)).startTime())
				.isEqualTo(LocalTime.of(7, 0));
		assertThatThrownBy(() -> service.createTemplate(new ShiftTemplateRequest("X", LocalTime.of(7, 0), LocalTime.of(7, 0), 1)))
				.isInstanceOf(BusinessException.class);
		service.deleteTemplate(3L);
		verify(shiftRepository).detachTemplate(3L);
		verify(templateRepository).delete(night);
	}

	@Test
	void deleteShiftRemovesIt() {
		WorkShift existing = shift(5L, FRIDAY.atTime(6, 0), FRIDAY.atTime(14, 0));
		when(shiftRepository.findById(9L)).thenReturn(Optional.of(existing));

		service.deleteShift(9L);

		verify(shiftRepository).delete(existing);
		when(shiftRepository.findById(10L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> service.deleteShift(10L)).isInstanceOf(BusinessException.class);
	}

	@Test
	void staffSeesDoorCodeWhenOnShiftNowOrStayOverlapsOwnShift() {
		LocalDateTime now = FRIDAY.atTime(10, 0);
		LocalDateTime in = FRIDAY.atTime(22, 0);
		LocalDateTime out = FRIDAY.plusDays(1).atTime(10, 0);
		when(shiftRepository.existsForAccountBetween(5L, now, now.plusSeconds(1))).thenReturn(true, false, false);
		when(shiftRepository.existsForAccountBetween(5L, in, out)).thenReturn(true, false);

		assertThat(service.canSeeDoorCode(5L, in, out)).isTrue();
		assertThat(service.canSeeDoorCode(5L, in, out)).isTrue();
		assertThat(service.canSeeDoorCode(5L, in, out)).isFalse();
	}

	@Test
	void coverageCountsStaffPickupsAndListsThoseWithoutActiveShift() {
		Account locked = new Account();
		setId(Account.class, locked, 6L);
		locked.setStatus(AccountStatus.LOCKED);
		when(accountRepository.findAll()).thenReturn(List.of(hong, locked));
		when(shiftRepository.findOverlapping(FRIDAY.atStartOfDay(), FRIDAY.plusDays(2).atStartOfDay())).thenReturn(List.of(
				shift(5L, FRIDAY.atTime(22, 0), FRIDAY.plusDays(1).atTime(6, 0)),
				shift(6L, FRIDAY.atTime(6, 0), FRIDAY.atTime(14, 0))));
		RentalOrder nightOrder = order(41L, FRIDAY.atTime(22, 30));
		RentalOrder morningOrder = order(42L, FRIDAY.atTime(10, 0));
		when(orderRepository.findStaffPickupsBetween(FRIDAY.atStartOfDay(), FRIDAY.plusDays(2).atStartOfDay()))
				.thenReturn(List.of(morningOrder, nightOrder));

		when(templateRepository.findAllByOrderByStartTimeAsc()).thenReturn(List.of(morning, night));

		CoverageDto result = service.coverage(FRIDAY, FRIDAY.plusDays(2));

		assertThat(result.days()).containsExactly(new CoverageDto.Day(FRIDAY, 2, 1), new CoverageDto.Day(FRIDAY.plusDays(1), 0, 0));
		assertThat(result.uncovered()).singleElement().satisfies(u -> {
			assertThat(u.orderCode()).isEqualTo("SH-1042");
			assertThat(u.roomNumber()).isEqualTo("201");
		});
		assertThat(result.needs()).containsExactly(new CoverageDto.Need(FRIDAY, 1L));
	}

	@Test
	void neededTemplateOfEarlyMorningIsPreviousNightWithinRange() {
		List<ShiftTemplate> templates = List.of(morning, night);
		LocalDateTime saturday2am = FRIDAY.plusDays(1).atTime(2, 0);

		assertThat(ScheduleService.neededTemplates(saturday2am, templates, FRIDAY, FRIDAY.plusDays(7)))
				.containsExactly(new CoverageDto.Need(FRIDAY, 3L));
		assertThat(ScheduleService.neededTemplates(saturday2am, templates, FRIDAY.plusDays(1), FRIDAY.plusDays(7))).isEmpty();
		assertThat(ScheduleService.neededTemplates(FRIDAY.atTime(15, 0), templates, FRIDAY, FRIDAY.plusDays(7))).isEmpty();
	}

	private RentalOrder order(Long id, LocalDateTime checkIn) {
		RentalOrder o = new RentalOrder();
		setId(RentalOrder.class, o, id);
		Room room = new Room();
		room.setRoomNumber("201");
		o.setRoom(room);
		o.setCheckInAt(checkIn);
		return o;
	}

	private ShiftTemplate template(Long id, String name, int start, int end, int color) {
		ShiftTemplate t = new ShiftTemplate();
		setId(ShiftTemplate.class, t, id);
		t.setName(name);
		t.setStartTime(LocalTime.of(start, 0));
		t.setEndTime(LocalTime.of(end, 0));
		t.setColor(color);
		return t;
	}

	private WorkShift shift(Long accountId, LocalDateTime start, LocalDateTime end) {
		WorkShift s = new WorkShift();
		s.setAccountId(accountId);
		s.setTemplateId(1L);
		s.setName("Sáng");
		s.setColor(1);
		s.setStartAt(start);
		s.setEndAt(end);
		return s;
	}

	private static <T> void setId(Class<T> type, T target, Long id) {
		try {
			var field = type.getDeclaredField("id");
			field.setAccessible(true);
			field.set(target, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}
