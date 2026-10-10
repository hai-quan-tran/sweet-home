package com.sweethome.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra nghiệp vụ thêm/sửa phòng, bật-tắt nhận đặt, thêm/xoá ảnh.
 */
@ExtendWith(MockitoExtension.class)
class RoomServiceTest {

	@Mock
	private RoomRepository roomRepository;
	@Mock
	private RoomTypeRepository roomTypeRepository;
	@Mock
	private RoomPhotoRepository roomPhotoRepository;
	@Mock
	private RoomPhotoStorageService storageService;

	private RoomService service;
	private RoomType standard;

	@BeforeEach
	void setUp() {
		service = new RoomService(roomRepository, roomTypeRepository, roomPhotoRepository, storageService);
		standard = RoomTestFactory.roomType(1L, "Tiêu chuẩn", 150000, 50000, 350000, 500000);
	}

	private RoomUpsertRequest requestByType() {
		return new RoomUpsertRequest("101", "Mộc", 1, 1L, 2, "1 giường đôi", "Góc yên tĩnh",
				RoomPricingMode.ROOM_TYPE, null, null, null, null, CheckInMode.SELF, "Hướng dẫn", true);
	}

	@Test
	void createSucceedsAndUsesRoomTypePricing() {
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.empty());
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(standard));
		when(roomRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		RoomDto dto = service.create(requestByType());

		assertThat(dto.roomNumber()).isEqualTo("101");
		assertThat(dto.effectiveTwoHourPrice()).isEqualTo(150000L);
		assertThat(dto.pricingMode()).isEqualTo(RoomPricingMode.ROOM_TYPE);
	}

	@Test
	void createFailsWhenRoomNumberAlreadyExists() {
		Room existing = RoomTestFactory.room(9L, "101", standard);
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(requestByType())).isInstanceOf(BusinessException.class);
	}

	@Test
	void createFailsWhenRoomTypeMissing() {
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.empty());
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(requestByType())).isInstanceOf(BusinessException.class);
	}

	@Test
	void createFailsWhenRoomTypeHidden() {
		standard.setActive(false);
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.empty());
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(standard));

		assertThatThrownBy(() -> service.create(requestByType())).isInstanceOf(BusinessException.class);
	}

	@Test
	void createFailsWhenOwnPricingMissingSomePrices() {
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.empty());
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(standard));
		var request = new RoomUpsertRequest("101", "Mộc", 1, 1L, 2, null, null,
				RoomPricingMode.OWN, 100000L, 30000L, null, null, CheckInMode.SELF, null, true);

		assertThatThrownBy(() -> service.create(request)).isInstanceOf(BusinessException.class);
	}

	@Test
	void createSucceedsWithFullOwnPricing() {
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.empty());
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(standard));
		when(roomRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
		var request = new RoomUpsertRequest("101", "Mộc", 1, 1L, 2, null, null,
				RoomPricingMode.OWN, 100000L, 30000L, 250000L, 400000L, CheckInMode.SELF, null, true);

		RoomDto dto = service.create(request);

		assertThat(dto.effectiveTwoHourPrice()).isEqualTo(100000L);
		assertThat(dto.effectiveDailyPrice()).isEqualTo(400000L);
	}

	@Test
	void updateAllowsKeepingSameRoomNumber() {
		Room room = RoomTestFactory.room(5L, "101", standard);
		when(roomRepository.findById(5L)).thenReturn(Optional.of(room));
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.of(room));
		when(roomTypeRepository.findById(1L)).thenReturn(Optional.of(standard));
		when(roomRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		RoomDto dto = service.update(5L, requestByType());

		assertThat(dto.roomNumber()).isEqualTo("101");
	}

	@Test
	void updateFailsWhenRoomNumberBelongsToAnotherRoom() {
		Room room = RoomTestFactory.room(5L, "999", standard);
		Room other = RoomTestFactory.room(6L, "101", standard);
		when(roomRepository.findById(5L)).thenReturn(Optional.of(room));
		when(roomRepository.findByRoomNumberIgnoreCase("101")).thenReturn(Optional.of(other));

		assertThatThrownBy(() -> service.update(5L, requestByType())).isInstanceOf(BusinessException.class);
	}

	@Test
	void getThrowsWhenRoomNotFound() {
		when(roomRepository.findById(404L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(404L)).isInstanceOf(BusinessException.class);
	}

	@Test
	void setAcceptingBookingsTogglesFlag() {
		Room room = RoomTestFactory.room(5L, "101", standard);
		when(roomRepository.findById(5L)).thenReturn(Optional.of(room));
		when(roomRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

		RoomDto dto = service.setAcceptingBookings(5L, false);

		assertThat(dto.acceptingBookings()).isFalse();
	}

	@Test
	void addPhotosAppendsWithIncreasingSortOrder() {
		Room room = RoomTestFactory.room(5L, "101", standard);
		when(roomRepository.findById(5L)).thenReturn(Optional.of(room));
		when(roomPhotoRepository.findMaxSortOrder(5L)).thenReturn(1);
		when(storageService.save(any())).thenReturn("stored.jpg");

		MockMultipartFile f1 = new MockMultipartFile("files", "a.jpg", "image/jpeg", "a".getBytes());
		service.addPhotos(5L, List.of(f1));

		var captor = org.mockito.ArgumentCaptor.forClass(RoomPhoto.class);
		verify(roomPhotoRepository).save(captor.capture());
		assertThat(captor.getValue().getSortOrder()).isEqualTo(2);
	}

	@Test
	void deletePhotoRemovesDbRowAndFile() {
		Room room = RoomTestFactory.room(5L, "101", standard);
		RoomPhoto photo = RoomTestFactory.photo(10L, room, "stored.jpg", 0);
		when(roomPhotoRepository.findById(10L)).thenReturn(Optional.of(photo));
		when(roomRepository.findById(5L)).thenReturn(Optional.of(room));

		service.deletePhoto(5L, 10L);

		verify(roomPhotoRepository).delete(photo);
		verify(storageService).delete("stored.jpg");
	}

	@Test
	void deletePhotoFailsWhenPhotoBelongsToDifferentRoom() {
		Room room = RoomTestFactory.room(5L, "101", standard);
		RoomPhoto photo = RoomTestFactory.photo(10L, room, "stored.jpg", 0);
		when(roomPhotoRepository.findById(10L)).thenReturn(Optional.of(photo));

		assertThatThrownBy(() -> service.deletePhoto(99L, 10L)).isInstanceOf(BusinessException.class);
	}

	@Test
	void readPhotoDelegatesToStorage() {
		Room room = RoomTestFactory.room(5L, "101", standard);
		RoomPhoto photo = RoomTestFactory.photo(10L, room, "stored.jpg", 0);
		when(roomPhotoRepository.findById(10L)).thenReturn(Optional.of(photo));
		var stored = new RoomPhotoStorageService.StoredFile("x".getBytes(), "image/jpeg");
		when(storageService.read("stored.jpg")).thenReturn(stored);

		var result = service.readPhoto(10L);

		assertThat(result.contentType()).isEqualTo("image/jpeg");
	}
}
