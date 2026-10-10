package com.sweethome.room;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;

/**
 * Quản lý hạng phòng (bảng giá) và khung giờ áp dụng chung. Màn "Sửa bảng giá" lưu cả hai trong
 * một lần gọi, phản ánh đúng dialog ở frontend.
 */
@Service
public class PricingService {

	private final RoomTypeRepository roomTypeRepository;
	private final RoomRepository roomRepository;
	private final PricingSettingsRepository pricingSettingsRepository;

	public PricingService(RoomTypeRepository roomTypeRepository, RoomRepository roomRepository,
			PricingSettingsRepository pricingSettingsRepository) {
		this.roomTypeRepository = roomTypeRepository;
		this.roomRepository = roomRepository;
		this.pricingSettingsRepository = pricingSettingsRepository;
	}

	/**
	 * Lấy danh sách hạng phòng (kèm số phòng thuộc từng hạng) và khung giờ chung hiện tại.
	 *
	 * @return dữ liệu cho tab Bảng giá và dialog Sửa bảng giá
	 */
	@Transactional(readOnly = true)
	public PricingOverviewResponse overview() {
		Map<Long, List<String>> roomNumbersByType = new LinkedHashMap<>();
		for (var room : roomRepository.findAllByOrderByRoomNumberAsc()) {
			roomNumbersByType.computeIfAbsent(room.getRoomType().getId(), id -> new ArrayList<>()).add(room.getRoomNumber());
		}
		List<RoomType> all = roomTypeRepository.findAll();
		List<RoomTypeDto> roomTypes = all.stream().filter(RoomType::isActive)
				.map(t -> toDto(t, roomNumbersByType)).toList();
		List<RoomTypeDto> hiddenRoomTypes = all.stream().filter(t -> !t.isActive())
				.map(t -> toDto(t, roomNumbersByType)).toList();
		PricingSettings settings = pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)
				.orElseThrow(() -> new IllegalStateException("Thiếu dữ liệu khung giờ mặc định"));
		return new PricingOverviewResponse(roomTypes, hiddenRoomTypes, PricingSettingsDto.from(settings));
	}

	private RoomTypeDto toDto(RoomType t, Map<Long, List<String>> roomNumbersByType) {
		return new RoomTypeDto(t.getId(), t.getName(), t.getTwoHourPrice(), t.getExtraHourPrice(),
				t.getOvernightPrice(), t.getDailyPrice(), roomNumbersByType.getOrDefault(t.getId(), List.of()));
	}

	/**
	 * Lưu toàn bộ danh sách hạng phòng (thêm/sửa/xoá) và khung giờ chung.
	 *
	 * @param request danh sách hạng phòng sau khi sửa và khung giờ mới
	 * @return dữ liệu mới nhất sau khi lưu
	 */
	@Transactional
	public PricingOverviewResponse update(PricingOverviewUpdateRequest request) {
		validateNoDuplicateNames(request.roomTypes());

		Set<Long> keptIds = new HashSet<>();
		for (RoomTypeUpsertItem item : request.roomTypes()) {
			RoomType type = item.id() == null ? new RoomType() : roomTypeRepository.findById(item.id())
					.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Hạng phòng không tồn tại"));
			type.setName(item.name());
			type.setTwoHourPrice(item.twoHourPrice());
			type.setExtraHourPrice(item.extraHourPrice());
			type.setOvernightPrice(item.overnightPrice());
			type.setDailyPrice(item.dailyPrice());
			type.setActive(true);
			roomTypeRepository.save(type);
			keptIds.add(type.getId());
		}

		for (RoomType existing : roomTypeRepository.findAll()) {
			if (keptIds.contains(existing.getId()) || !existing.isActive()) {
				continue;
			}
			if (!roomRepository.findByRoomTypeId(existing.getId()).isEmpty()) {
				throw new BusinessException(HttpStatus.CONFLICT, "Không ẩn được hạng còn phòng: " + existing.getName());
			}
			existing.setActive(false);
			roomTypeRepository.save(existing);
		}

		PricingSettings settings = pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)
				.orElseThrow(() -> new IllegalStateException("Thiếu dữ liệu khung giờ mặc định"));
		settings.setMinHours(request.settings().minHours());
		settings.setOvernightCheckIn(request.settings().overnightCheckIn());
		settings.setOvernightCheckOut(request.settings().overnightCheckOut());
		settings.setDailyCheckIn(request.settings().dailyCheckIn());
		settings.setDailyCheckOut(request.settings().dailyCheckOut());
		pricingSettingsRepository.save(settings);

		return overview();
	}

	private void validateNoDuplicateNames(List<RoomTypeUpsertItem> items) {
		Set<String> seen = new HashSet<>();
		Set<String> duplicates = items.stream()
				.map(i -> i.name().trim().toLowerCase())
				.filter(name -> !seen.add(name))
				.collect(Collectors.toSet());
		if (!duplicates.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Tên hạng phòng bị trùng trong danh sách");
		}
	}
}
