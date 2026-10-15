package com.sweethome.activity;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Một dòng nhật ký trả về màn Nhân viên.
 *
 * @param id         id dòng nhật ký
 * @param createdAt  thời điểm thao tác
 * @param actor      tên đăng nhập ("system" = Hệ thống)
 * @param actorName  họ tên hiện tại của người thao tác, null với Hệ thống hoặc tài khoản không còn
 * @param action     loại thao tác
 * @param detail     nội dung hiển thị
 * @param orderId    id đơn liên quan, null nếu không có
 * @param orderCode  mã đơn hiển thị ("SH-1036"), null nếu không có
 * @param roomNumber số phòng lúc thao tác, null nếu không có
 */
public record ActivityLogDto(Long id, LocalDateTime createdAt, String actor, String actorName, ActivityAction action,
		String detail, Long orderId, String orderCode, String roomNumber) {

	/**
	 * Một trang nhật ký.
	 *
	 * @param items các dòng
	 * @param total tổng số dòng khớp bộ lọc
	 */
	public record Page(List<ActivityLogDto> items, long total) {
	}
}
