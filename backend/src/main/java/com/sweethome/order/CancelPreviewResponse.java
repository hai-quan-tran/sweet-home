package com.sweethome.order;

/**
 * Mức hoàn cọc app tự tính khi huỷ tại thời điểm hiện tại.
 *
 * @param refundPercent       phần trăm cọc được hoàn (100, 50 hoặc 0)
 * @param defaultRefundAmount số tiền hoàn mặc định
 * @param paidAmount          tổng đã thu (giới hạn trên của số tiền hoàn)
 */
public record CancelPreviewResponse(int refundPercent, long defaultRefundAmount, long paidAmount) {
}
