package com.sweethome.surcharge;

/**
 * Điều kiện áp dụng phụ thu. Mỗi loại gắn với đúng một đơn vị tính cố định (không cho chọn cách
 * thu tự do) để tránh cấu hình mơ hồ:
 * <ul>
 * <li>{@code OVERSTAY}: quá giờ trả phòng, tính theo giá "mỗi giờ thêm" của hạng phòng.</li>
 * <li>{@code EXTRA_GUEST}: vượt số khách tối đa, tính số tiền cố định mỗi khách vượt.</li>
 * <li>{@code WEEKDAY}: các ngày trong tuần, tính % trên giá phòng của ngày đó.</li>
 * <li>{@code DATE_RANGE}: các khoảng ngày (lễ, Tết), tính % trên giá phòng của ngày đó.</li>
 * <li>{@code MANUAL}: nhân viên thêm tay vào đơn, tính số tiền cố định mỗi lần thêm.</li>
 * </ul>
 */
public enum SurchargeWhenType {
	OVERSTAY, EXTRA_GUEST, WEEKDAY, DATE_RANGE, MANUAL
}
