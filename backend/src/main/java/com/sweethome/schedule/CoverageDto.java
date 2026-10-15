package com.sweethome.schedule;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Độ phủ ca với đơn cần nhân viên đón: số đơn và số đơn không ai trực theo từng ngày, kèm danh sách
 * các đơn không ai trực.
 *
 * @param days      từng ngày trong khoảng
 * @param uncovered đơn có giờ nhận phòng không nằm trong ca nào
 */
public record CoverageDto(List<Day> days, List<UncoveredOrder> uncovered) {

	/**
	 * Một ngày.
	 *
	 * @param date      ngày
	 * @param total     số đơn cần nhân viên đón có giờ nhận trong ngày
	 * @param uncovered số đơn trong đó không có ai trực lúc nhận phòng
	 */
	public record Day(LocalDate date, int total, int uncovered) {
	}

	/**
	 * Đơn cần nhân viên đón nhưng không ai trực.
	 *
	 * @param orderId    id đơn
	 * @param orderCode  mã đơn
	 * @param roomNumber số phòng
	 * @param checkInAt  giờ nhận phòng
	 */
	public record UncoveredOrder(Long orderId, String orderCode, String roomNumber, LocalDateTime checkInAt) {
	}
}
