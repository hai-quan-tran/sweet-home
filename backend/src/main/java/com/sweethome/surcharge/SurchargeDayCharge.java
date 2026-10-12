package com.sweethome.surcharge;

import java.time.LocalDate;

/**
 * Một ngày khách ở, kèm giá phòng tính cho ngày đó (dùng để tính % phụ thu theo ngày).
 *
 * @param date     ngày khách ở
 * @param roomPrice giá phòng áp dụng cho ngày đó
 */
public record SurchargeDayCharge(LocalDate date, long roomPrice) {
}
