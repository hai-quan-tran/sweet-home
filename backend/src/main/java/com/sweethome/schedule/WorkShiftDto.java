package com.sweethome.schedule;

import java.time.LocalDateTime;

/**
 * Ca đã xếp trả về frontend.
 *
 * @param id         id
 * @param accountId  tài khoản
 * @param templateId ca mẫu (null = ca lẻ hoặc mẫu đã xoá)
 * @param name       tên ca lúc xếp
 * @param color      màu lúc xếp (0 = ca lẻ)
 * @param startAt    giờ bắt đầu
 * @param endAt      giờ kết thúc
 * @param edited     giờ khác ca mẫu lúc lưu
 * @param note       ghi chú
 */
public record WorkShiftDto(Long id, Long accountId, Long templateId, String name, int color, LocalDateTime startAt,
		LocalDateTime endAt, boolean edited, String note) {

	/**
	 * Dựng từ entity.
	 *
	 * @param s ca
	 * @return DTO
	 */
	public static WorkShiftDto from(WorkShift s) {
		return new WorkShiftDto(s.getId(), s.getAccountId(), s.getTemplateId(), s.getName(), s.getColor(), s.getStartAt(),
				s.getEndAt(), s.isEdited(), s.getNote());
	}

	/**
	 * Kết quả sao chép tuần trước.
	 *
	 * @param copied  số ca đã chép
	 * @param skipped số ca bỏ qua (trùng giờ, tài khoản khoá, chưa tới ngày bắt đầu làm)
	 */
	public record CopyResult(int copied, int skipped) {
	}
}
