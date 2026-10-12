package com.sweethome.order;

/**
 * Mã cửa đã giải mã của một đơn (xem hoặc chèn vào tin nhắn gửi khách).
 *
 * @param doorCode mã cửa, null nếu đơn không có (checkInMode == STAFF)
 */
public record DoorCodeResponse(String doorCode) {
}
