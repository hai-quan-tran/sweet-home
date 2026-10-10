package com.sweethome.room;

import java.time.LocalTime;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Khung giờ áp dụng chung cho mọi hạng phòng.
 *
 * @param minHours           số giờ tối thiểu khi thuê theo giờ
 * @param overnightCheckIn   giờ nhận phòng của loại qua đêm
 * @param overnightCheckOut  giờ trả phòng hôm sau của loại qua đêm
 * @param dailyCheckIn       giờ nhận phòng của loại theo ngày
 * @param dailyCheckOut      giờ trả phòng hôm sau của loại theo ngày
 */
public record PricingSettingsDto(
		@NotNull(message = "Bắt buộc nhập") @Min(value = 1, message = "Phải lớn hơn 0") Integer minHours,
		@NotNull(message = "Bắt buộc nhập") LocalTime overnightCheckIn,
		@NotNull(message = "Bắt buộc nhập") LocalTime overnightCheckOut,
		@NotNull(message = "Bắt buộc nhập") LocalTime dailyCheckIn,
		@NotNull(message = "Bắt buộc nhập") LocalTime dailyCheckOut) {

	/**
	 * Dựng từ entity.
	 *
	 * @param settings entity khung giờ
	 * @return dữ liệu trả về cho frontend
	 */
	public static PricingSettingsDto from(PricingSettings settings) {
		return new PricingSettingsDto(settings.getMinHours(), settings.getOvernightCheckIn(),
				settings.getOvernightCheckOut(), settings.getDailyCheckIn(), settings.getDailyCheckOut());
	}
}
