package com.sweethome.order;

import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.activity.ActivityAction;
import com.sweethome.activity.ActivityLogService;
import com.sweethome.common.error.BusinessException;

/**
 * Thu tiền của đơn (khoản thu thêm ngoài cọc). Mọi vai trò được thu; sửa/xoá khoản đã thu chỉ
 * Quản lý (chặn ở controller). Tổng đã thu không được vượt tổng tiền đơn.
 */
@Service
public class OrderPaymentService {

	private static final Set<OrderStatus> CLOSED = Set.of(OrderStatus.CHECKED_OUT, OrderStatus.CANCELLED);

	private final RentalOrderRepository orderRepository;
	private final ActivityLogService activityLog;

	public OrderPaymentService(RentalOrderRepository orderRepository, ActivityLogService activityLog) {
		this.orderRepository = orderRepository;
		this.activityLog = activityLog;
	}

	/**
	 * Thêm một khoản thu.
	 *
	 * @param orderId id đơn
	 * @param request số tiền, hình thức, ghi chú
	 * @return đơn sau khi thu
	 */
	@Transactional
	public OrderDto add(Long orderId, OrderPaymentRequest request) {
		RentalOrder order = findOpenOrder(orderId);
		OrderPayment payment = new OrderPayment();
		apply(payment, request);
		order.addPayment(payment);
		ensureNotOverpaid(order);
		log(order, ActivityAction.PAYMENT_ADDED, "Thu " + describe(payment));
		return OrderDto.from(orderRepository.saveAndFlush(order));
	}

	/**
	 * Sửa một khoản đã thu.
	 *
	 * @param orderId   id đơn
	 * @param paymentId id khoản thu
	 * @param request   dữ liệu mới
	 * @return đơn sau khi sửa
	 */
	@Transactional
	public OrderDto update(Long orderId, Long paymentId, OrderPaymentRequest request) {
		RentalOrder order = findOpenOrder(orderId);
		OrderPayment payment = findPayment(order, paymentId);
		String before = describe(payment);
		apply(payment, request);
		ensureNotOverpaid(order);
		log(order, ActivityAction.PAYMENT_UPDATED, "Sửa khoản thu %s thành %s".formatted(before, describe(payment)));
		return OrderDto.from(orderRepository.saveAndFlush(order));
	}

	/**
	 * Xoá một khoản đã thu.
	 *
	 * @param orderId   id đơn
	 * @param paymentId id khoản thu
	 * @return đơn sau khi xoá
	 */
	@Transactional
	public OrderDto delete(Long orderId, Long paymentId) {
		RentalOrder order = findOpenOrder(orderId);
		OrderPayment payment = findPayment(order, paymentId);
		order.getPayments().remove(payment);
		log(order, ActivityAction.PAYMENT_DELETED, "Xoá khoản thu " + describe(payment));
		return OrderDto.from(orderRepository.saveAndFlush(order));
	}

	/** "300.000đ tiền mặt" — mô tả khoản thu trong nhật ký. */
	private static String describe(OrderPayment payment) {
		return ActivityLogService.money(payment.getAmount()) + " " + payment.getMethod().label();
	}

	private void log(RentalOrder order, ActivityAction action, String detail) {
		activityLog.log(action, order.getId(), order.getRoom().getRoomNumber(), detail);
	}

	private void apply(OrderPayment payment, OrderPaymentRequest request) {
		payment.setAmount(request.amount());
		payment.setMethod(request.method());
		payment.setNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
	}

	private void ensureNotOverpaid(RentalOrder order) {
		if (order.getPaidAmount() > order.getTotalAmount()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Tổng đã thu vượt tổng tiền của đơn");
		}
	}

	private RentalOrder findOpenOrder(Long id) {
		RentalOrder order = orderRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Đơn không tồn tại"));
		if (CLOSED.contains(order.getStatus())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Đơn đã trả phòng hoặc đã huỷ, không sửa tiền được");
		}
		return order;
	}

	private OrderPayment findPayment(RentalOrder order, Long paymentId) {
		return order.getPayments().stream().filter(p -> p.getId().equals(paymentId)).findFirst()
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Khoản thu không tồn tại"));
	}
}
