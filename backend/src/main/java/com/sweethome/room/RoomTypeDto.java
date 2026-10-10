package com.sweethome.room;

import java.util.List;

/**
 * Hạng phòng kèm danh sách số phòng thuộc hạng (hiển thị dưới tên hạng trong bảng giá).
 *
 * @param id              id hạng phòng
 * @param name            tên hạng
 * @param twoHourPrice    giá áp dụng cho số giờ tối thiểu ("2 giờ đầu")
 * @param extraHourPrice  giá mỗi giờ thêm
 * @param overnightPrice  giá qua đêm
 * @param dailyPrice      giá theo ngày
 * @param roomNumbers     số các phòng thuộc hạng này
 */
public record RoomTypeDto(Long id, String name, Long twoHourPrice, Long extraHourPrice, Long overnightPrice,
		Long dailyPrice, List<String> roomNumbers) {
}
