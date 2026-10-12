package com.sweethome.surcharge;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Dữ liệu một đơn cần tính phụ thu. "Ngày khách ở" theo đúng quy tắc nghiệp vụ: đơn theo giờ và
 * qua đêm chỉ có một ngày (ngày nhận phòng); đơn theo ngày có từng ngày từ lúc nhận đến trước lúc
 * trả.
 *
 * @param stayDays            các ngày khách ở, kèm giá phòng của từng ngày
 * @param extraHourPrice      giá "mỗi giờ thêm" của hạng phòng, dùng tính phụ thu quá giờ
 * @param scheduledCheckOut   giờ hẹn trả phòng; null nếu không áp dụng phụ thu quá giờ
 * @param actualCheckOut      giờ trả phòng thực tế; null nếu chưa trả phòng
 * @param extraGuestCount     số khách vượt số khách tối đa (0 nếu không vượt)
 * @param manualSurchargeIds  id các phụ thu "thêm tay" được chọn thêm vào đơn
 */
public record SurchargeCalculationInput(
		List<SurchargeDayCharge> stayDays,
		long extraHourPrice,
		LocalDateTime scheduledCheckOut,
		LocalDateTime actualCheckOut,
		int extraGuestCount,
		Set<Long> manualSurchargeIds) {
}
