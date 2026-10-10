package com.sweethome.room;

import java.util.List;

/**
 * Dữ liệu cho tab "Bảng giá" và dialog "Sửa bảng giá": danh sách hạng phòng + khung giờ chung.
 *
 * @param roomTypes       danh sách hạng phòng đang dùng (active)
 * @param hiddenRoomTypes hạng phòng đã ẩn (xoá mềm), giữ lại để khôi phục
 * @param settings        khung giờ áp dụng chung
 */
public record PricingOverviewResponse(List<RoomTypeDto> roomTypes, List<RoomTypeDto> hiddenRoomTypes,
		PricingSettingsDto settings) {
}
