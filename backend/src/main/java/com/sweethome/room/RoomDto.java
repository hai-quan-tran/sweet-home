package com.sweethome.room;

import java.util.List;

/**
 * Thông tin đầy đủ một phòng, dùng cho cả danh sách và chi tiết/sửa. Giá "effective*" là giá
 * thật sự áp dụng (giá riêng nếu {@code pricingMode == OWN}, ngược lại lấy theo hạng phòng).
 */
public record RoomDto(
		Long id,
		String roomNumber,
		String name,
		Integer floor,
		Long roomTypeId,
		String roomTypeName,
		Integer maxGuests,
		String bedConfig,
		String description,
		RoomPricingMode pricingMode,
		Long ownTwoHourPrice,
		Long ownExtraHourPrice,
		Long ownOvernightPrice,
		Long ownDailyPrice,
		Long effectiveTwoHourPrice,
		Long effectiveExtraHourPrice,
		Long effectiveOvernightPrice,
		Long effectiveDailyPrice,
		CheckInMode defaultCheckInMode,
		String checkInGuide,
		boolean acceptingBookings,
		List<RoomPhotoDto> photos) {

	/**
	 * Dựng từ entity, tự tính giá áp dụng theo {@code pricingMode}.
	 *
	 * @param room phòng
	 * @return dữ liệu trả về cho frontend
	 */
	public static RoomDto from(Room room) {
		RoomType type = room.getRoomType();
		boolean own = room.getPricingMode() == RoomPricingMode.OWN;
		List<RoomPhotoDto> photos = room.getPhotos().stream()
				.map(p -> RoomPhotoDto.from(p, p.getSortOrder() == 0))
				.toList();
		return new RoomDto(room.getId(), room.getRoomNumber(), room.getName(), room.getFloor(), type.getId(),
				type.getName(), room.getMaxGuests(), room.getBedConfig(), room.getDescription(), room.getPricingMode(),
				room.getOwnTwoHourPrice(), room.getOwnExtraHourPrice(), room.getOwnOvernightPrice(), room.getOwnDailyPrice(),
				own ? room.getOwnTwoHourPrice() : type.getTwoHourPrice(),
				own ? room.getOwnExtraHourPrice() : type.getExtraHourPrice(),
				own ? room.getOwnOvernightPrice() : type.getOvernightPrice(),
				own ? room.getOwnDailyPrice() : type.getDailyPrice(),
				room.getDefaultCheckInMode(), room.getCheckInGuide(), room.isAcceptingBookings(), photos);
	}
}
