package com.sweethome.room;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

/**
 * Dữ liệu lưu từ dialog "Sửa bảng giá": toàn bộ danh sách hạng phòng (thêm/sửa/xoá so với hiện
 * có) và khung giờ chung, lưu trong một lần.
 *
 * @param roomTypes danh sách hạng phòng sau khi sửa
 * @param settings  khung giờ áp dụng chung
 */
public record PricingOverviewUpdateRequest(
		@NotEmpty(message = "Phải có ít nhất một hạng phòng") List<@Valid RoomTypeUpsertItem> roomTypes,
		@NotNull(message = "Bắt buộc nhập") @Valid PricingSettingsDto settings) {
}
