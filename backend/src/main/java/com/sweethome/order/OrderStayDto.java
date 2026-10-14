package com.sweethome.order;

import java.time.LocalDateTime;

import com.sweethome.room.CheckInMode;

/**
 * Một chặng hiển thị trên lịch đặt phòng, kèm thông tin tóm tắt của đơn.
 *
 * @param orderId     id đơn
 * @param code        mã đơn hiển thị
 * @param roomId      phòng của chặng
 * @param status      trạng thái đơn
 * @param rentalType  loại thuê
 * @param checkInMode hình thức check-in
 * @param guestName   tên khách
 * @param startAt     giờ bắt đầu chặng
 * @param endAt       giờ kết thúc chặng
 */
public record OrderStayDto(Long orderId, String code, Long roomId, OrderStatus status, RentalType rentalType,
		CheckInMode checkInMode, String guestName, LocalDateTime startAt, LocalDateTime endAt) {

	/**
	 * Dựng DTO từ chặng (đơn phải được nạp sẵn).
	 *
	 * @param stay chặng
	 * @return DTO
	 */
	public static OrderStayDto from(OrderStay stay) {
		RentalOrder order = stay.getOrder();
		return new OrderStayDto(order.getId(), OrderDto.codeOf(order.getId()), stay.getRoom().getId(), order.getStatus(),
				order.getRentalType(), order.getCheckInMode(), order.getGuestName(), stay.getStartAt(), stay.getEndAt());
	}
}
