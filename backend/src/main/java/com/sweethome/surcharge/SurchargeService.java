package com.sweethome.surcharge;

import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.RoomType;
import com.sweethome.room.RoomTypeRepository;

/**
 * Quản lý cấu hình phụ thu: thêm/sửa, ẩn/khôi phục (xoá mềm). Bộ tính tiền phụ thu nằm riêng ở
 * {@link SurchargeCalculator}.
 */
@Service
public class SurchargeService {

	private static final int DEFAULT_GRACE_MINUTES = 15;

	private final SurchargeRepository surchargeRepository;
	private final RoomTypeRepository roomTypeRepository;

	public SurchargeService(SurchargeRepository surchargeRepository, RoomTypeRepository roomTypeRepository) {
		this.surchargeRepository = surchargeRepository;
		this.roomTypeRepository = roomTypeRepository;
	}

	/**
	 * Toàn bộ phụ thu (gồm đã ẩn), sắp theo điều kiện áp dụng rồi theo tên.
	 *
	 * @return danh sách phụ thu cho màn Phòng &amp; bảng giá, tab Phụ thu
	 */
	@Transactional(readOnly = true)
	public List<SurchargeDto> list() {
		return surchargeRepository.findAll().stream()
				.sorted(Comparator.comparing(Surcharge::getWhenType).thenComparing(s -> s.getName().toLowerCase()))
				.map(SurchargeDto::from)
				.toList();
	}

	/**
	 * Thêm phụ thu mới.
	 *
	 * @param request dữ liệu phụ thu
	 * @return phụ thu vừa tạo
	 */
	@Transactional
	public SurchargeDto create(SurchargeUpsertRequest request) {
		Surcharge surcharge = new Surcharge();
		applyRequest(surcharge, request);
		return SurchargeDto.from(surchargeRepository.save(surcharge));
	}

	/**
	 * Sửa phụ thu.
	 *
	 * @param id      id phụ thu
	 * @param request dữ liệu phụ thu
	 * @return phụ thu sau khi sửa
	 */
	@Transactional
	public SurchargeDto update(Long id, SurchargeUpsertRequest request) {
		Surcharge surcharge = findSurcharge(id);
		applyRequest(surcharge, request);
		return SurchargeDto.from(surchargeRepository.save(surcharge));
	}

	/**
	 * Ẩn hoặc khôi phục một phụ thu.
	 *
	 * @param id     id phụ thu
	 * @param active trạng thái mới
	 * @return phụ thu sau khi đổi
	 */
	@Transactional
	public SurchargeDto setActive(Long id, boolean active) {
		Surcharge surcharge = findSurcharge(id);
		if (active && isSingleton(surcharge.getWhenType())) {
			rejectIfAnotherActiveSingletonExists(surcharge.getWhenType(), id);
		}
		surcharge.setActive(active);
		return SurchargeDto.from(surchargeRepository.save(surcharge));
	}

	private void applyRequest(Surcharge surcharge, SurchargeUpsertRequest request) {
		Set<RoomType> roomTypes = resolveActiveRoomTypes(request.roomTypeIds());

		surcharge.setName(request.name());
		surcharge.setWhenType(request.whenType());
		surcharge.setRoomTypes(roomTypes);

		switch (request.whenType()) {
			case OVERSTAY -> {
				surcharge.setGraceMinutes(request.graceMinutes() != null ? request.graceMinutes() : DEFAULT_GRACE_MINUTES);
				surcharge.setAmount(null);
				surcharge.setWeekdays(Set.of());
				surcharge.setDateRanges(List.of());
			}
			case EXTRA_GUEST, MANUAL -> {
				surcharge.setAmount(requirePositiveAmount(request.amount()));
				surcharge.setGraceMinutes(null);
				surcharge.setWeekdays(Set.of());
				surcharge.setDateRanges(List.of());
			}
			case WEEKDAY -> {
				Set<DayOfWeek> weekdays = request.weekdays() == null ? Set.of() : new HashSet<>(request.weekdays());
				if (weekdays.isEmpty()) {
					throw new BusinessException(HttpStatus.BAD_REQUEST, "Phải chọn ít nhất một ngày trong tuần");
				}
				surcharge.setAmount(requirePositiveAmount(request.amount()));
				surcharge.setWeekdays(weekdays);
				surcharge.setGraceMinutes(null);
				surcharge.setDateRanges(List.of());
			}
			case DATE_RANGE -> {
				if (request.dateRanges() == null || request.dateRanges().isEmpty()) {
					throw new BusinessException(HttpStatus.BAD_REQUEST, "Phải có ít nhất một khoảng ngày");
				}
				List<SurchargeDateRange> ranges = request.dateRanges().stream().map(r -> {
					if (r.toDate().isBefore(r.fromDate())) {
						throw new BusinessException(HttpStatus.BAD_REQUEST, "Đến ngày phải sau hoặc bằng từ ngày: " + r.name());
					}
					SurchargeDateRange range = new SurchargeDateRange();
					range.setName(r.name());
					range.setFromDate(r.fromDate());
					range.setToDate(r.toDate());
					return range;
				}).toList();
				surcharge.setAmount(requirePositiveAmount(request.amount()));
				surcharge.setDateRanges(ranges);
				surcharge.setGraceMinutes(null);
				surcharge.setWeekdays(Set.of());
			}
		}

		if (surcharge.isActive() && isSingleton(request.whenType())) {
			rejectIfAnotherActiveSingletonExists(request.whenType(), surcharge.getId());
		}
	}

	private Long requirePositiveAmount(Long amount) {
		if (amount == null || amount <= 0) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Mức thu phải lớn hơn 0");
		}
		return amount;
	}

	private Set<RoomType> resolveActiveRoomTypes(List<Long> roomTypeIds) {
		List<RoomType> found = roomTypeRepository.findAllById(roomTypeIds);
		if (found.size() != Set.copyOf(roomTypeIds).size()) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "Hạng phòng không tồn tại");
		}
		for (RoomType type : found) {
			if (!type.isActive()) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "Hạng phòng đã ẩn, không áp dụng được: " + type.getName());
			}
		}
		return new HashSet<>(found);
	}

	/** Quá giờ trả phòng và vượt số khách tối đa chỉ nên có đúng một cấu hình đang hoạt động. */
	private boolean isSingleton(SurchargeWhenType whenType) {
		return whenType == SurchargeWhenType.OVERSTAY || whenType == SurchargeWhenType.EXTRA_GUEST;
	}

	private void rejectIfAnotherActiveSingletonExists(SurchargeWhenType whenType, Long excludingId) {
		boolean exists = surchargeRepository.findByWhenTypeAndActiveTrue(whenType).stream()
				.anyMatch(s -> !s.getId().equals(excludingId));
		if (exists) {
			throw new BusinessException(HttpStatus.CONFLICT, "Đã có phụ thu đang hoạt động cho điều kiện này");
		}
	}

	private Surcharge findSurcharge(Long id) {
		return surchargeRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Phụ thu không tồn tại"));
	}
}
