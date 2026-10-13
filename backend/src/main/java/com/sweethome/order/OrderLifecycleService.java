package com.sweethome.order;

import java.time.Clock;
import java.time.LocalDateTime;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;

/**
 * Vòng đời đơn: nhận phòng và tự chuyển trạng thái theo giờ (xem {@code business-rules.md} mục
 * Check-in / check-out).
 */
@Service
public class OrderLifecycleService {

	private final RentalOrderRepository orderRepository;
	private final Clock clock;

	public OrderLifecycleService(RentalOrderRepository orderRepository, Clock clock) {
		this.orderRepository = orderRepository;
		this.clock = clock;
	}

	/**
	 * Nhân viên xác nhận khách đã nhận phòng (giờ nhận thực tế = bây giờ). Chỉ đơn Đã đặt.
	 *
	 * @param orderId id đơn
	 * @return đơn sau khi nhận phòng
	 */
	@Transactional
	public OrderDto checkIn(Long orderId) {
		RentalOrder order = orderRepository.findById(orderId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Đơn không tồn tại"));
		if (order.getStatus() != OrderStatus.BOOKED) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chỉ nhận phòng được đơn ở trạng thái Đã đặt");
		}
		order.setStatus(OrderStatus.CHECKED_IN);
		order.setActualCheckInAt(LocalDateTime.now(clock));
		return OrderDto.from(orderRepository.save(order));
	}

	/**
	 * Tự chuyển trạng thái các đơn đã tới mốc giờ. Gọi định kỳ mỗi phút.
	 *
	 * @return số đơn đã đổi trạng thái
	 */
	@Transactional
	public int advanceStatuses() {
		LocalDateTime now = LocalDateTime.now(clock);
		int changed = 0;
		for (RentalOrder order : orderRepository.findDueForAutoTransition(now)) {
			if (advance(order, now)) {
				changed++;
			}
		}
		return changed;
	}

	/**
	 * Chuyển trạng thái một đơn theo giờ (có thể qua 2 bước trong một lần nếu đã trễ cả giờ trả):
	 * khách tự check-in: Đã đặt → Đang ở (giờ nhận thực tế = giờ nhận hẹn) → Chờ xác nhận trả;
	 * nhân viên đón: Đang ở → Quá giờ.
	 *
	 * @return true nếu trạng thái thay đổi
	 */
	static boolean advance(RentalOrder order, LocalDateTime now) {
		OrderStatus before = order.getStatus();
		boolean self = order.getCheckInMode() == CheckInMode.SELF;
		if (order.getStatus() == OrderStatus.BOOKED && self && !order.getCheckInAt().isAfter(now)) {
			order.setStatus(OrderStatus.CHECKED_IN);
			order.setActualCheckInAt(order.getCheckInAt());
		}
		if (order.getStatus() == OrderStatus.CHECKED_IN && !order.getCheckOutAt().isAfter(now)) {
			order.setStatus(self ? OrderStatus.PENDING_CHECKOUT : OrderStatus.OVERSTAY);
		}
		return order.getStatus() != before;
	}
}
