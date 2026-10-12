package com.sweethome.order;

import java.util.List;
import java.util.Map;

/**
 * Một trang danh sách đơn, kèm số lượng theo từng trạng thái cho các tab lọc.
 *
 * @param items         danh sách đơn trong trang
 * @param total         tổng số đơn khớp bộ lọc hiện tại (không tính trạng thái, dùng phân trang)
 * @param countByStatus số đơn theo từng trạng thái (không áp bộ lọc khác), dùng hiện số trên tab
 */
public record OrderListResponse(List<OrderDto> items, long total, Map<OrderStatus, Long> countByStatus) {
}
