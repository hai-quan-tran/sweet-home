package com.sweethome.order;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Dữ liệu huỷ đơn.
 *
 * @param refundAmount số tiền hoàn cho khách; khác mức app tự tính thì chỉ Quản lý và bắt buộc lý do
 * @param reason       lý do huỷ
 */
public record CancelRequest(
		@NotNull(message = "Bắt buộc nhập") @PositiveOrZero(message = "Không được âm") Long refundAmount,
		@Size(max = 255, message = "Tối đa 255 ký tự") String reason) {
}
