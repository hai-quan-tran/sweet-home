package com.sweethome.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra xem/lưu bảng giá (hạng phòng + khung giờ chung).
 */
@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

	@Mock
	private RoomTypeRepository roomTypeRepository;
	@Mock
	private RoomRepository roomRepository;
	@Mock
	private PricingSettingsRepository pricingSettingsRepository;

	private PricingService service;
	private PricingSettings settings;

	@BeforeEach
	void setUp() {
		service = new PricingService(roomTypeRepository, roomRepository, pricingSettingsRepository);
		settings = new PricingSettings();
		settings.setMinHours(2);
		settings.setOvernightCheckIn(LocalTime.of(21, 0));
		settings.setOvernightCheckOut(LocalTime.of(12, 0));
		settings.setDailyCheckIn(LocalTime.of(14, 0));
		settings.setDailyCheckOut(LocalTime.of(12, 0));
	}

	@Test
	void overviewGroupsRoomNumbersByType() {
		RoomType standard = RoomTestFactory.roomType(1L, "Tiêu chuẩn", 150000, 50000, 350000, 500000);
		Room r101 = RoomTestFactory.room(1L, "101", standard);
		Room r102 = RoomTestFactory.room(2L, "102", standard);
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of(r101, r102));
		when(roomTypeRepository.findAll()).thenReturn(List.of(standard));
		when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));

		PricingOverviewResponse overview = service.overview();

		assertThat(overview.roomTypes()).hasSize(1);
		assertThat(overview.roomTypes().get(0).roomNumbers()).containsExactly("101", "102");
		assertThat(overview.settings().minHours()).isEqualTo(2);
	}

	@Test
	void overviewReturnsEmptyRoomNumbersForUnusedType() {
		RoomType empty = RoomTestFactory.roomType(1L, "Trống hạng", 1, 1, 1, 1);
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of());
		when(roomTypeRepository.findAll()).thenReturn(List.of(empty));
		when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));

		PricingOverviewResponse overview = service.overview();

		assertThat(overview.roomTypes().get(0).roomNumbers()).isEmpty();
	}

	@Test
	void updateRejectsDuplicateNamesInRequest() {
		var items = List.of(
				new RoomTypeUpsertItem(null, "Tiêu chuẩn", 1L, 1L, 1L, 1L),
				new RoomTypeUpsertItem(null, "tiêu chuẩn", 2L, 2L, 2L, 2L));
		var request = new PricingOverviewUpdateRequest(items, PricingSettingsDto.from(settings));

		assertThatThrownBy(() -> service.update(request)).isInstanceOf(BusinessException.class);
		verify(roomTypeRepository, never()).save(any());
	}

	@Test
	void updateCreatesNewTypeAndUpdatesExistingOne() {
		RoomType existing = RoomTestFactory.roomType(1L, "Tiêu chuẩn", 150000, 50000, 350000, 500000);
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(existing));
		when(roomTypeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
		when(roomTypeRepository.findAll()).thenReturn(List.of(existing));
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of());
		when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));

		var items = List.of(
				new RoomTypeUpsertItem(1L, "Tiêu chuẩn", 160000L, 55000L, 360000L, 520000L),
				new RoomTypeUpsertItem(null, "Ban công", 180000L, 60000L, 420000L, 650000L));
		var request = new PricingOverviewUpdateRequest(items, PricingSettingsDto.from(settings));

		service.update(request);

		assertThat(existing.getTwoHourPrice()).isEqualTo(160000L);
		verify(roomTypeRepository, times(2)).save(any());
	}

	@Test
	void updateHidesTypeNotInListWhenNoRoomUses() {
		RoomType removed = RoomTestFactory.roomType(2L, "Gác mái", 1, 1, 1, 1);
		when(roomTypeRepository.findAll()).thenReturn(List.of(removed));
		when(roomRepository.findByRoomTypeId(2L)).thenReturn(List.of());
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of());
		when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));

		var request = new PricingOverviewUpdateRequest(List.of(), PricingSettingsDto.from(settings));
		// roomTypes rỗng bị chặn bởi @NotEmpty ở tầng controller; service tự nó không chặn, test riêng logic ẩn
		service.update(request);

		assertThat(removed.isActive()).isFalse();
		verify(roomTypeRepository, never()).delete(any());
	}

	@Test
	void updateBlocksHidingTypeStillUsedByRoom() {
		RoomType inUse = RoomTestFactory.roomType(3L, "Ban công", 1, 1, 1, 1);
		Room room = RoomTestFactory.room(1L, "201", inUse);
		when(roomTypeRepository.findAll()).thenReturn(List.of(inUse));
		when(roomRepository.findByRoomTypeId(3L)).thenReturn(List.of(room));

		var request = new PricingOverviewUpdateRequest(List.of(), PricingSettingsDto.from(settings));

		assertThatThrownBy(() -> service.update(request)).isInstanceOf(BusinessException.class);
		assertThat(inUse.isActive()).isTrue();
	}

	@Test
	void updateRestoresHiddenTypeWhenIncludedInRequest() {
		RoomType hidden = RoomTestFactory.roomType(4L, "Gác mái", 1, 1, 1, 1);
		hidden.setActive(false);
		when(roomTypeRepository.findById(4L)).thenReturn(Optional.of(hidden));
		when(roomTypeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
		when(roomTypeRepository.findAll()).thenReturn(List.of(hidden));
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of());
		when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));

		var items = List.of(new RoomTypeUpsertItem(4L, "Gác mái", 1L, 1L, 1L, 1L));
		var request = new PricingOverviewUpdateRequest(items, PricingSettingsDto.from(settings));

		service.update(request);

		assertThat(hidden.isActive()).isTrue();
	}

	@Test
	void overviewSeparatesHiddenTypes() {
		RoomType active = RoomTestFactory.roomType(1L, "Tiêu chuẩn", 1, 1, 1, 1);
		RoomType hidden = RoomTestFactory.roomType(2L, "Gác mái", 1, 1, 1, 1);
		hidden.setActive(false);
		when(roomRepository.findAllByOrderByRoomNumberAsc()).thenReturn(List.of());
		when(roomTypeRepository.findAll()).thenReturn(List.of(active, hidden));
		when(pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)).thenReturn(Optional.of(settings));

		PricingOverviewResponse overview = service.overview();

		assertThat(overview.roomTypes()).extracting(RoomTypeDto::id).containsExactly(1L);
		assertThat(overview.hiddenRoomTypes()).extracting(RoomTypeDto::id).containsExactly(2L);
	}
}
