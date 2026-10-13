package com.sweethome.order;

import java.util.List;

/**
 * Kết quả xem trước khi trả phòng.
 *
 * @param newSurcharges   phụ thu sẽ cộng thêm (quá giờ, thêm tay)
 * @param totalAmount     tổng tiền sau khi cộng phụ thu mới
 * @param paidAmount      đã thu
 * @param dueAmount       còn phải thu lúc trả phòng
 * @param manualOptions   các phụ thu "thêm tay" chọn được cho hạng phòng của đơn
 */
public record CheckoutPreviewResponse(
		List<OrderSurchargeDto> newSurcharges,
		long totalAmount,
		long paidAmount,
		long dueAmount,
		List<ManualSurchargeOption> manualOptions) {

	/** Một phụ thu "thêm tay" có thể chọn. */
	public record ManualSurchargeOption(Long id, String name, long amount) {
	}
}
