package com.sweethome.schedule;

import java.time.LocalTime;

/**
 * Ca mẫu trả về frontend.
 *
 * @param id        id
 * @param name      tên ca
 * @param startTime giờ bắt đầu
 * @param endTime   giờ kết thúc (≤ giờ bắt đầu = hôm sau)
 * @param color     màu hiển thị
 */
public record ShiftTemplateDto(Long id, String name, LocalTime startTime, LocalTime endTime, int color) {

	/**
	 * Dựng từ entity.
	 *
	 * @param t ca mẫu
	 * @return DTO
	 */
	public static ShiftTemplateDto from(ShiftTemplate t) {
		return new ShiftTemplateDto(t.getId(), t.getName(), t.getStartTime(), t.getEndTime(), t.getColor());
	}
}
