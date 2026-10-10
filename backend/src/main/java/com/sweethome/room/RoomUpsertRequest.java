package com.sweethome.room;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Dữ liệu thêm/sửa phòng.
 *
 * @param roomNumber         số phòng, không trùng
 * @param name               tên phòng
 * @param floor              tầng, có thể bỏ trống
 * @param roomTypeId         hạng phòng
 * @param maxGuests          số khách tối đa
 * @param bedConfig          mô tả giường, có thể bỏ trống
 * @param description        mô tả ngắn, có thể bỏ trống
 * @param pricingMode        theo hạng phòng hay giá riêng
 * @param ownTwoHourPrice    giá riêng 2 giờ đầu, bắt buộc nếu pricingMode = OWN
 * @param ownExtraHourPrice  giá riêng mỗi giờ thêm, bắt buộc nếu pricingMode = OWN
 * @param ownOvernightPrice  giá riêng qua đêm, bắt buộc nếu pricingMode = OWN
 * @param ownDailyPrice      giá riêng theo ngày, bắt buộc nếu pricingMode = OWN
 * @param defaultCheckInMode hình thức check-in mặc định
 * @param checkInGuide       hướng dẫn tự nhận phòng, có thể bỏ trống
 * @param acceptingBookings  có nhận đặt phòng không
 */
public record RoomUpsertRequest(
		@NotBlank(message = "Bắt buộc nhập") String roomNumber,
		@NotBlank(message = "Bắt buộc nhập") String name,
		Integer floor,
		@NotNull(message = "Bắt buộc nhập") Long roomTypeId,
		@NotNull(message = "Bắt buộc nhập") @Positive(message = "Phải lớn hơn 0") Integer maxGuests,
		String bedConfig,
		String description,
		@NotNull(message = "Bắt buộc nhập") RoomPricingMode pricingMode,
		Long ownTwoHourPrice,
		Long ownExtraHourPrice,
		Long ownOvernightPrice,
		Long ownDailyPrice,
		@NotNull(message = "Bắt buộc nhập") CheckInMode defaultCheckInMode,
		String checkInGuide,
		boolean acceptingBookings) {
}
