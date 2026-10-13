package com.sweethome.order;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Tác vụ nền: mỗi phút tự chuyển trạng thái đơn theo giờ nhận/trả. */
@Component
public class OrderStatusScheduler {

	private final OrderLifecycleService lifecycleService;

	public OrderStatusScheduler(OrderLifecycleService lifecycleService) {
		this.lifecycleService = lifecycleService;
	}

	/** Chạy mỗi phút, bắt đầu sau 1 phút kể từ khi khởi động. */
	@Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
	public void run() {
		lifecycleService.advanceStatuses();
	}
}
