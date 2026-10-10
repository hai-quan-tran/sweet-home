package com.sweethome.room;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.sweethome.common.error.BusinessException;

/**
 * Quản lý phòng: thêm/sửa thông tin, bật/tắt nhận đặt, thêm/xoá ảnh.
 */
@Service
public class RoomService {

	private final RoomRepository roomRepository;
	private final RoomTypeRepository roomTypeRepository;
	private final RoomPhotoRepository roomPhotoRepository;
	private final RoomPhotoStorageService storageService;

	public RoomService(RoomRepository roomRepository, RoomTypeRepository roomTypeRepository,
			RoomPhotoRepository roomPhotoRepository, RoomPhotoStorageService storageService) {
		this.roomRepository = roomRepository;
		this.roomTypeRepository = roomTypeRepository;
		this.roomPhotoRepository = roomPhotoRepository;
		this.storageService = storageService;
	}

	/**
	 * Danh sách toàn bộ phòng, sắp theo số phòng.
	 *
	 * @return danh sách phòng
	 */
	@Transactional(readOnly = true)
	public List<RoomDto> list() {
		return roomRepository.findAllByOrderByRoomNumberAsc().stream().map(RoomDto::from).toList();
	}

	/**
	 * Chi tiết một phòng.
	 *
	 * @param id id phòng
	 * @return thông tin phòng
	 */
	@Transactional(readOnly = true)
	public RoomDto get(Long id) {
		return RoomDto.from(findRoom(id));
	}

	/**
	 * Tạo phòng mới.
	 *
	 * @param request dữ liệu phòng
	 * @return phòng vừa tạo
	 */
	@Transactional
	public RoomDto create(RoomUpsertRequest request) {
		Room room = new Room();
		applyRequest(room, request);
		return RoomDto.from(roomRepository.save(room));
	}

	/**
	 * Sửa thông tin phòng.
	 *
	 * @param id      id phòng
	 * @param request dữ liệu phòng
	 * @return phòng sau khi sửa
	 */
	@Transactional
	public RoomDto update(Long id, RoomUpsertRequest request) {
		Room room = findRoom(id);
		applyRequest(room, request);
		return RoomDto.from(roomRepository.save(room));
	}

	/**
	 * Bật/tắt nhận đặt phòng (công tắc nhanh trên thẻ phòng).
	 *
	 * @param id         id phòng
	 * @param accepting  trạng thái mới
	 * @return phòng sau khi đổi
	 */
	@Transactional
	public RoomDto setAcceptingBookings(Long id, boolean accepting) {
		Room room = findRoom(id);
		room.setAcceptingBookings(accepting);
		return RoomDto.from(roomRepository.save(room));
	}

	/**
	 * Thêm ảnh vào cuối danh sách ảnh của phòng (ảnh đầu tiên lưu lúc tạo phòng mặc nhiên là ảnh bìa).
	 *
	 * @param id    id phòng
	 * @param files các file ảnh gửi lên
	 * @return phòng sau khi thêm ảnh
	 */
	@Transactional
	public RoomDto addPhotos(Long id, List<MultipartFile> files) {
		Room room = findRoom(id);
		int nextOrder = roomPhotoRepository.findMaxSortOrder(id) + 1;
		for (MultipartFile file : files) {
			String storedName = storageService.save(file);
			RoomPhoto photo = new RoomPhoto();
			photo.setRoom(room);
			photo.setFilePath(storedName);
			photo.setSortOrder(nextOrder++);
			roomPhotoRepository.save(photo);
		}
		return get(id);
	}

	/**
	 * Xoá một ảnh của phòng (cả bản ghi DB lẫn file trên đĩa).
	 *
	 * @param roomId  id phòng
	 * @param photoId id ảnh
	 * @return phòng sau khi xoá ảnh
	 */
	@Transactional
	public RoomDto deletePhoto(Long roomId, Long photoId) {
		RoomPhoto photo = roomPhotoRepository.findById(photoId)
				.filter(p -> p.getRoom().getId().equals(roomId))
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh"));
		roomPhotoRepository.delete(photo);
		storageService.delete(photo.getFilePath());
		return get(roomId);
	}

	/**
	 * Đọc nội dung một ảnh để trả về cho trình duyệt.
	 *
	 * @param photoId id ảnh
	 * @return nội dung và kiểu MIME của file ảnh
	 */
	@Transactional(readOnly = true)
	public RoomPhotoStorageService.StoredFile readPhoto(Long photoId) {
		RoomPhoto photo = roomPhotoRepository.findById(photoId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh"));
		return storageService.read(photo.getFilePath());
	}

	private void applyRequest(Room room, RoomUpsertRequest request) {
		roomRepository.findByRoomNumberIgnoreCase(request.roomNumber())
				.filter(existing -> !existing.getId().equals(room.getId()))
				.ifPresent(existing -> {
					throw new BusinessException(HttpStatus.CONFLICT, "Số phòng đã tồn tại");
				});
		RoomType roomType = roomTypeRepository.findById(request.roomTypeId())
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Hạng phòng không tồn tại"));
		if (!roomType.isActive()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Hạng phòng đã ẩn, không gán được cho phòng");
		}
		if (request.pricingMode() == RoomPricingMode.OWN && (request.ownTwoHourPrice() == null
				|| request.ownExtraHourPrice() == null || request.ownOvernightPrice() == null
				|| request.ownDailyPrice() == null)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Phải nhập đủ 4 mức giá khi chọn giá riêng cho phòng");
		}

		room.setRoomNumber(request.roomNumber());
		room.setName(request.name());
		room.setFloor(request.floor());
		room.setRoomType(roomType);
		room.setMaxGuests(request.maxGuests());
		room.setBedConfig(request.bedConfig());
		room.setDescription(request.description());
		room.setPricingMode(request.pricingMode());
		room.setOwnTwoHourPrice(request.ownTwoHourPrice());
		room.setOwnExtraHourPrice(request.ownExtraHourPrice());
		room.setOwnOvernightPrice(request.ownOvernightPrice());
		room.setOwnDailyPrice(request.ownDailyPrice());
		room.setDefaultCheckInMode(request.defaultCheckInMode());
		room.setCheckInGuide(request.checkInGuide());
		room.setAcceptingBookings(request.acceptingBookings());
	}

	private Room findRoom(Long id) {
		return roomRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));
	}
}
