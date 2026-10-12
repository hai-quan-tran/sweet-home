package com.sweethome.surcharge;

/**
 * Một dòng phụ thu đã tính được cộng vào đơn.
 *
 * @param surchargeId id phụ thu
 * @param name        tên phụ thu (snapshot tại lúc tính)
 * @param amount      số tiền
 */
public record SurchargeLineItem(Long surchargeId, String name, long amount) {
}
