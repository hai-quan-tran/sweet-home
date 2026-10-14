package com.sweethome.order;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;

/**
 * Gia hạn đơn đang ở: thêm giờ (giá mỗi giờ thêm) hoặc thêm ngày (giá ngày), giờ trả mới phải cách
 * đơn kế tiếp của phòng ít nhất 1 tiếng (xem {@code business-rules.md} mục Gia hạn).
 */
@Service
public class OrderExtensionService {

	/** Khoảng trống tối thiểu giữa giờ trả mới và giờ nhận của đơn kế tiếp. */
	static final Duration GAP_BEFORE_NEXT = Duration.ofHours(1);

	private static final Set<OrderStatus> STAYING = Set.of(OrderStatus.CHECKED_IN, OrderStatus.OVERSTAY,
			OrderStatus.PENDING_CHECKOUT);

	private final RentalOrderRepository orderRepository;

	public OrderExtensionService(RentalOrderRepository orderRepository) {
		this.orderRepository = orderRepository;
	}

	/**
	 * Xem trước gia hạn: giờ trả mới, phí, đơn kế tiếp và giới hạn giữ phòng. Không lưu DB.
	 *
	 * @param orderId id đơn
	 * @param request kiểu và số lượng gia hạn
	 * @return kết quả xem trước
	 */
	@Transactional(readOnly = true)
	public ExtendPreviewResponse preview(Long orderId, ExtendRequest request) {
		return compute(findStayingOrder(orderId), request);
	}

	/**
	 * Gia hạn tại phòng đang ở: dời giờ trả, thêm dòng phí "Gia hạn +…" vào đơn, thu ngay nếu chọn;
	 * đơn Quá giờ/Chờ xác nhận trả quay về Đang ở.
	 *
	 * @param orderId id đơn
	 * @param request kiểu, số lượng, cách thu tiền
	 * @return đơn sau khi gia hạn
	 */
	@Transactional
	public OrderDto extend(Long orderId, ExtendRequest request) {
		RentalOrder order = findStayingOrder(orderId);
		ExtendPreviewResponse preview = compute(order, request);
		if (!preview.available()) {
			throw new BusinessException(HttpStatus.CONFLICT, "Phòng chỉ giữ được đến %s vì đơn %s nhận phòng lúc %s"
					.formatted(preview.maxCheckOutAt().toLocalTime(), preview.nextOrder().code(),
							preview.nextOrder().checkInAt().toLocalTime()));
		}
		if (request.collectNow() && request.paymentMethod() == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chọn hình thức thu phí gia hạn");
		}
		order.extendTo(preview.newCheckOutAt());
		OrderSurcharge fee = new OrderSurcharge();
		fee.setName("Gia hạn +%d %s".formatted(request.quantity(), request.type() == ExtendType.HOUR ? "giờ" : "ngày"));
		fee.setAmount(preview.fee());
		order.addSurcharge(fee);
		order.setTotalAmount(order.getTotalAmount() + preview.fee());
		if (request.collectNow()) {
			OrderPayment payment = new OrderPayment();
			payment.setAmount(preview.fee());
			payment.setMethod(request.paymentMethod());
			payment.setNote("Thu khi gia hạn");
			order.addPayment(payment);
		}
		// Tác vụ mỗi phút sẽ chuyển lại Quá giờ/Chờ xác nhận nếu giờ trả mới vẫn đã qua.
		order.setStatus(OrderStatus.CHECKED_IN);
		return OrderDto.from(orderRepository.saveAndFlush(order));
	}

	/** Tính giờ trả mới, phí và giới hạn theo đơn kế tiếp ở phòng đang ở. */
	private ExtendPreviewResponse compute(RentalOrder order, ExtendRequest request) {
		LocalDateTime currentOut = order.getCheckOutAt();
		boolean hourly = request.type() == ExtendType.HOUR;
		LocalDateTime newOut = hourly ? currentOut.plusHours(request.quantity()) : currentOut.plusDays(request.quantity());
		long unitPrice = hourly ? order.getExtraHourPriceSnapshot() : order.getDailyPriceSnapshot();

		OrderStay next = orderRepository.findStaysStartingFrom(order.getRoom().getId(), order.getId(), currentOut,
				PageRequest.of(0, 1)).stream().findFirst().orElse(null);
		ExtendPreviewResponse.NextOrder nextOrder = null;
		LocalDateTime maxOut = null;
		Integer maxExtraHours = null;
		if (next != null) {
			nextOrder = new ExtendPreviewResponse.NextOrder(OrderDto.codeOf(next.getOrder().getId()),
					next.getOrder().getGuestName(), next.getStartAt());
			maxOut = next.getStartAt().minus(GAP_BEFORE_NEXT);
			maxExtraHours = (int) Math.max(0, Duration.between(currentOut, maxOut).toHours());
		}
		return new ExtendPreviewResponse(order.getExtraHourPriceSnapshot(), order.getDailyPriceSnapshot(), currentOut,
				newOut, unitPrice * request.quantity(), nextOrder, maxOut, maxExtraHours,
				maxOut == null || !newOut.isAfter(maxOut));
	}

	private RentalOrder findStayingOrder(Long orderId) {
		RentalOrder order = orderRepository.findById(orderId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Đơn không tồn tại"));
		if (!STAYING.contains(order.getStatus())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chỉ gia hạn được đơn khách đang ở");
		}
		return order;
	}
}
