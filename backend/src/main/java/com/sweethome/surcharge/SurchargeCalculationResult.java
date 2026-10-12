package com.sweethome.surcharge;

import java.util.List;

/**
 * Kết quả tính phụ thu cho một đơn.
 *
 * @param items các dòng phụ thu đã tính (không gồm dòng có số tiền 0)
 * @param total tổng các dòng
 */
public record SurchargeCalculationResult(List<SurchargeLineItem> items, long total) {
}
