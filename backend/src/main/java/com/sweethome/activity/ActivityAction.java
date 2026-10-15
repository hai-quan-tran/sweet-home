package com.sweethome.activity;

/**
 * Loại thao tác ghi vào nhật ký. Nội dung hiển thị nằm ở {@code ActivityLog.detail}; loại dùng để lọc/truy vấn
 * (ví dụ GĐ9 tìm đơn đã sao chép tin nhắn có mã cửa).
 */
public enum ActivityAction {
	ORDER_CREATED,
	ORDER_UPDATED,
	CHECK_IN,
	CHECK_OUT,
	PAYMENT_ADDED,
	PAYMENT_UPDATED,
	PAYMENT_DELETED,
	ORDER_CANCELLED,
	ORDER_EXTENDED,
	STATUS_AUTO,
	ROOM_CLEANED,
	DOOR_CODE_VIEWED,
	DOOR_CODE_COPIED,
	ACCOUNT_CREATED,
	ACCOUNT_UPDATED
}
