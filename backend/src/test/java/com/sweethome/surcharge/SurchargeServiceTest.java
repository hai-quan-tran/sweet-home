package com.sweethome.surcharge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.RoomType;
import com.sweethome.room.RoomTypeRepository;

/**
 * Kiểm tra nghiệp vụ thêm/sửa/ẩn-khôi phục phụ thu: chỉ một số trường có nghĩa theo từng
 * "áp dụng khi", chỉ một phụ thu đang hoạt động cho quá giờ/vượt khách, chặn hạng phòng đã ẩn.
 */
@ExtendWith(MockitoExtension.class)
class SurchargeServiceTest {

	@Mock
	private SurchargeRepository surchargeRepository;
	@Mock
	private RoomTypeRepository roomTypeRepository;

	private SurchargeService service;
	private RoomType standard;

	@BeforeEach
	void setUp() {
		service = new SurchargeService(surchargeRepository, roomTypeRepository);
		standard = roomType(1L, "Tiêu chuẩn", true);
		lenient().when(surchargeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
	}

	private RoomType roomType(long id, String name, boolean active) {
		RoomType type = new RoomType();
		type.setName(name);
		type.setActive(active);
		try {
			var field = RoomType.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(type, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
		return type;
	}

	@Test
	void createOverstayDefaultsGraceAndClearsOtherFields() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		when(surchargeRepository.findByWhenTypeAndActiveTrue(SurchargeWhenType.OVERSTAY)).thenReturn(List.of());
		var request = new SurchargeUpsertRequest("Quá giờ trả phòng", SurchargeWhenType.OVERSTAY, null, null, null,
				null, List.of(1L));

		SurchargeDto dto = service.create(request);

		assertThat(dto.graceMinutes()).isEqualTo(15);
		assertThat(dto.amount()).isNull();
		assertThat(dto.weekdays()).isEmpty();
		assertThat(dto.dateRanges()).isEmpty();
	}

	@Test
	void createRejectsSecondActiveOverstaySurcharge() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		Surcharge existing = SurchargeTestFactory.overstay(9, "Quá giờ trả phòng", 15);
		when(surchargeRepository.findByWhenTypeAndActiveTrue(SurchargeWhenType.OVERSTAY)).thenReturn(List.of(existing));
		var request = new SurchargeUpsertRequest("Quá giờ trả phòng 2", SurchargeWhenType.OVERSTAY, null, 20, null,
				null, List.of(1L));

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createWeekdayRequiresAtLeastOneDay() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		var request = new SurchargeUpsertRequest("Cuối tuần", SurchargeWhenType.WEEKDAY, 10L, null, Set.of(),
				null, List.of(1L));

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createWeekdaySucceedsAndIgnoresUnrelatedFields() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		var request = new SurchargeUpsertRequest("Cuối tuần", SurchargeWhenType.WEEKDAY, 10L, 99,
				Set.of(DayOfWeek.FRIDAY, DayOfWeek.SATURDAY), null, List.of(1L));

		SurchargeDto dto = service.create(request);

		assertThat(dto.weekdays()).containsExactlyInAnyOrder(DayOfWeek.FRIDAY, DayOfWeek.SATURDAY);
		assertThat(dto.amount()).isEqualTo(10L);
		assertThat(dto.graceMinutes()).isNull();
	}

	@Test
	void createDateRangeRejectsEmptyList() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		var request = new SurchargeUpsertRequest("Ngày lễ, Tết", SurchargeWhenType.DATE_RANGE, 30L, null, null,
				List.of(), List.of(1L));

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createDateRangeRejectsToDateBeforeFromDate() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		var range = new SurchargeDateRangeRequest("Tết", LocalDate.of(2027, 2, 10), LocalDate.of(2027, 2, 5));
		var request = new SurchargeUpsertRequest("Ngày lễ, Tết", SurchargeWhenType.DATE_RANGE, 30L, null, null,
				List.of(range), List.of(1L));

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createExtraGuestRequiresPositiveAmount() {
		when(roomTypeRepository.findAllById(List.of(1L))).thenReturn(List.of(standard));
		var request = new SurchargeUpsertRequest("Thêm khách", SurchargeWhenType.EXTRA_GUEST, 0L, null, null, null,
				List.of(1L));

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createRejectsInactiveRoomType() {
		RoomType hidden = roomType(2L, "Gác mái", false);
		when(roomTypeRepository.findAllById(List.of(2L))).thenReturn(List.of(hidden));
		var request = new SurchargeUpsertRequest("Thêm khách", SurchargeWhenType.EXTRA_GUEST, 50000L, null, null,
				null, List.of(2L));

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void setActiveHidesAndRestoresWithoutSingletonConflict() {
		Surcharge manual = SurchargeTestFactory.manual(7, "Hút thuốc trong phòng", 200000);
		when(surchargeRepository.findById(7L)).thenReturn(Optional.of(manual));

		SurchargeDto hidden = service.setActive(7L, false);
		assertThat(hidden.active()).isFalse();

		SurchargeDto restored = service.setActive(7L, true);
		assertThat(restored.active()).isTrue();
	}

	@Test
	void setActiveRejectsRestoringWhenAnotherActiveSingletonExists() {
		Surcharge hidden = SurchargeTestFactory.overstay(8, "Quá giờ trả phòng cũ", 15);
		hidden.setActive(false);
		Surcharge current = SurchargeTestFactory.overstay(9, "Quá giờ trả phòng", 20);
		when(surchargeRepository.findById(8L)).thenReturn(Optional.of(hidden));
		when(surchargeRepository.findByWhenTypeAndActiveTrue(SurchargeWhenType.OVERSTAY)).thenReturn(List.of(current));

		assertThatThrownBy(() -> service.setActive(8L, true)).isInstanceOf(BusinessException.class);
	}
}
