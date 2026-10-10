package com.sweethome.room;

/**
 * Bật/tắt nhận đặt phòng (công tắc nhanh trên thẻ phòng).
 *
 * @param acceptingBookings trạng thái mới
 */
public record AcceptingBookingsRequest(boolean acceptingBookings) {
}
