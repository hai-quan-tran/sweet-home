package com.sweethome.surcharge;

import java.time.LocalDate;

/**
 * Một khoảng ngày của phụ thu kiểu {@code DATE_RANGE}.
 *
 * @param id       id khoảng ngày, null nếu chưa lưu
 * @param name     tên dịp (ví dụ "Tết Nguyên đán")
 * @param fromDate ngày bắt đầu
 * @param toDate   ngày kết thúc
 */
public record SurchargeDateRangeDto(Long id, String name, LocalDate fromDate, LocalDate toDate) {

	public static SurchargeDateRangeDto from(SurchargeDateRange range) {
		return new SurchargeDateRangeDto(range.getId(), range.getName(), range.getFromDate(), range.getToDate());
	}
}
