package com.sweethome.surcharge;

import java.time.DayOfWeek;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import com.sweethome.room.RoomType;

/**
 * Thông tin đầy đủ một phụ thu.
 *
 * @param id            id phụ thu
 * @param name          tên phụ thu
 * @param whenType      điều kiện áp dụng
 * @param amount        % (WEEKDAY, DATE_RANGE) hoặc số tiền (EXTRA_GUEST, MANUAL); null nếu OVERSTAY
 * @param graceMinutes  phút ân hạn; chỉ có giá trị khi {@code whenType == OVERSTAY}
 * @param weekdays      các ngày trong tuần áp dụng; chỉ có giá trị khi {@code whenType == WEEKDAY}
 * @param dateRanges    các khoảng ngày áp dụng; chỉ có giá trị khi {@code whenType == DATE_RANGE}
 * @param roomTypeIds   id các hạng phòng áp dụng
 * @param roomTypeNames tên các hạng phòng áp dụng, cùng thứ tự với {@code roomTypeIds}
 * @param active        còn hoạt động hay đã ẩn
 */
public record SurchargeDto(
		Long id,
		String name,
		SurchargeWhenType whenType,
		Long amount,
		Integer graceMinutes,
		Set<DayOfWeek> weekdays,
		List<SurchargeDateRangeDto> dateRanges,
		List<Long> roomTypeIds,
		List<String> roomTypeNames,
		boolean active) {

	public static SurchargeDto from(Surcharge surcharge) {
		List<RoomType> roomTypes = surcharge.getRoomTypes().stream()
				.sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName())).toList();
		return new SurchargeDto(
				surcharge.getId(),
				surcharge.getName(),
				surcharge.getWhenType(),
				surcharge.getAmount(),
				surcharge.getGraceMinutes(),
				// Copy ra khỏi collection do Hibernate quản lý (PersistentSet) trước khi trả về: với
				// open-in-view=false, Jackson serialize response sau khi transaction/Session đã đóng,
				// giữ nguyên tham chiếu PersistentSet làm lỗi 500 "Failed to write request" dù dữ liệu
				// đã nạp sẵn trong lúc map DTO.
				surcharge.getWeekdays().isEmpty() ? Set.of() : EnumSet.copyOf(surcharge.getWeekdays()),
				surcharge.getDateRanges().stream().map(SurchargeDateRangeDto::from).toList(),
				roomTypes.stream().map(RoomType::getId).toList(),
				roomTypes.stream().map(RoomType::getName).toList(),
				surcharge.isActive());
	}
}
