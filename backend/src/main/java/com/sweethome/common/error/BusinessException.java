package com.sweethome.common.error;

import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ có thông báo hiển thị được cho người dùng, ví dụ "Phòng đã có đơn trong khung giờ này".
 */
public class BusinessException extends RuntimeException {

	private final HttpStatus status;

	/**
	 * Tạo lỗi nghiệp vụ.
	 *
	 * @param status  mã HTTP trả về
	 * @param message thông báo tiếng Việt cho người dùng
	 */
	public BusinessException(HttpStatus status, String message) {
		super(message);
		this.status = status;
	}

	/**
	 * Mã HTTP trả về cho lỗi này.
	 *
	 * @return mã HTTP
	 */
	public HttpStatus getStatus() {
		return status;
	}
}
