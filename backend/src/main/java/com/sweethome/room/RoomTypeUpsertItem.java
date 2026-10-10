package com.sweethome.room;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Một dòng hạng phòng gửi lên khi lưu bảng giá. {@code id} null nghĩa là hạng mới.
 *
 * @param id              id hạng phòng, null nếu tạo mới
 * @param name            tên hạng
 * @param twoHourPrice    giá "2 giờ đầu" (hoặc theo số giờ tối thiểu đang cấu hình)
 * @param extraHourPrice  giá mỗi giờ thêm
 * @param overnightPrice  giá qua đêm
 * @param dailyPrice      giá theo ngày
 */
public record RoomTypeUpsertItem(
		Long id,
		@NotBlank(message = "Bắt buộc nhập") String name,
		@NotNull(message = "Bắt buộc nhập") @PositiveOrZero(message = "Không được âm") Long twoHourPrice,
		@NotNull(message = "Bắt buộc nhập") @PositiveOrZero(message = "Không được âm") Long extraHourPrice,
		@NotNull(message = "Bắt buộc nhập") @PositiveOrZero(message = "Không được âm") Long overnightPrice,
		@NotNull(message = "Bắt buộc nhập") @PositiveOrZero(message = "Không được âm") Long dailyPrice) {
}
