package com.sweethome.dashboard;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Thông báo trên chuông: các việc cần xử lý tính từ trạng thái hiện tại, xử lý xong thì tự mất.
 *
 * @param now   thời điểm tính
 * @param items thông báo, theo loại rồi theo giờ
 */
public record NotificationDto(LocalDateTime now, List<Item> items) {

	/** Loại thông báo (thứ tự hiển thị). */
	public enum Kind {
		OVERSTAY, PENDING_CHECKOUT, DOOR_CODE_NOT_SENT, UNCOVERED
	}

	/**
	 * Một thông báo.
	 *
	 * @param kind       loại
	 * @param orderId    id đơn
	 * @param orderCode  mã đơn
	 * @param roomNumber số phòng
	 * @param guestName  khách
	 * @param at         giờ trả (quá giờ, chờ xác nhận trả) hoặc giờ nhận (chưa gửi mã, không ai trực)
	 */
	public record Item(Kind kind, Long orderId, String orderCode, String roomNumber, String guestName, LocalDateTime at) {
	}
}
