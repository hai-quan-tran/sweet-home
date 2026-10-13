package com.sweethome.order;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;
import com.sweethome.surcharge.Surcharge;
import com.sweethome.surcharge.SurchargeCalculationInput;
import com.sweethome.surcharge.SurchargeCalculationResult;
import com.sweethome.surcharge.SurchargeCalculator;
import com.sweethome.surcharge.SurchargeRepository;
import com.sweethome.surcharge.SurchargeWhenType;

/**
 * Vòng đời đơn: nhận phòng, tự chuyển trạng thái theo giờ, trả phòng, huỷ (xem {@code business-rules.md} mục
 * Check-in / check-out, Huỷ đơn).
 */
@Service
public class OrderLifecycleService {

	private static final Set<OrderStatus> STAYING = Set.of(OrderStatus.CHECKED_IN, OrderStatus.OVERSTAY,
			OrderStatus.PENDING_CHECKOUT);

	private final RentalOrderRepository orderRepository;
	private final SurchargeRepository surchargeRepository;
	private final SurchargeCalculator surchargeCalculator;
	private final Clock clock;

	public OrderLifecycleService(RentalOrderRepository orderRepository, SurchargeRepository surchargeRepository,
			SurchargeCalculator surchargeCalculator, Clock clock) {
		this.orderRepository = orderRepository;
		this.surchargeRepository = surchargeRepository;
		this.surchargeCalculator = surchargeCalculator;
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
		RentalOrder order = findOrder(orderId);
		if (order.getStatus() != OrderStatus.BOOKED) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chỉ nhận phòng được đơn ở trạng thái Đã đặt");
		}
		order.setStatus(OrderStatus.CHECKED_IN);
		order.setActualCheckInAt(LocalDateTime.now(clock));
		return OrderDto.from(orderRepository.save(order));
	}

	/**
	 * Xem trước tiền khi trả phòng: phụ thu quá giờ theo giờ trả thực tế, phụ thu thêm tay đã chọn,
	 * tổng mới và số còn phải thu. Không lưu DB.
	 *
	 * @param orderId id đơn
	 * @param request giờ thực tế, phụ thu thêm tay
	 * @return kết quả xem trước
	 */
	@Transactional(readOnly = true)
	public CheckoutPreviewResponse previewCheckout(Long orderId, CheckoutRequest request) {
		return computeCheckout(findStayingOrder(orderId), request);
	}

	/**
	 * Trả phòng: lưu giờ thực tế, cộng phụ thu mới, thu đủ số còn lại, chuyển Đã trả và đánh dấu
	 * phòng Chờ dọn. Trả sớm không giảm tiền.
	 *
	 * @param orderId id đơn
	 * @param request giờ thực tế, phụ thu thêm tay, hình thức thu số còn lại
	 * @return đơn sau khi trả phòng
	 */
	@Transactional
	public OrderDto checkout(Long orderId, CheckoutRequest request) {
		RentalOrder order = findStayingOrder(orderId);
		CheckoutPreviewResponse result = computeCheckout(order, request);
		if (result.dueAmount() > 0 && request.paymentMethod() == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chọn hình thức thu số tiền còn lại");
		}
		order.setActualCheckInAt(request.actualCheckInAt());
		order.setActualCheckOutAt(request.actualCheckOutAt());
		for (OrderSurchargeDto item : result.newSurcharges()) {
			OrderSurcharge row = new OrderSurcharge();
			row.setName(item.name());
			row.setAmount(item.amount());
			order.addSurcharge(row);
		}
		order.setTotalAmount(result.totalAmount());
		if (result.dueAmount() > 0) {
			OrderPayment payment = new OrderPayment();
			payment.setAmount(result.dueAmount());
			payment.setMethod(request.paymentMethod());
			payment.setNote("Thu khi trả phòng");
			order.addPayment(payment);
		}
		order.setStatus(OrderStatus.CHECKED_OUT);
		order.getRoom().setNeedsCleaning(true);
		return OrderDto.from(orderRepository.saveAndFlush(order));
	}

	private CheckoutPreviewResponse computeCheckout(RentalOrder order, CheckoutRequest request) {
		if (!request.actualCheckOutAt().isAfter(request.actualCheckInAt())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Giờ trả thực tế phải sau giờ nhận thực tế");
		}
		List<Surcharge> applicable = surchargeRepository.findActiveByRoomTypeId(order.getRoom().getRoomType().getId());
		Set<Long> manualIds = request.manualSurchargeIds() == null ? Set.of() : request.manualSurchargeIds();
		SurchargeCalculationInput input = new SurchargeCalculationInput(List.of(), order.getExtraHourPriceSnapshot(),
				order.getCheckOutAt(), request.actualCheckOutAt(), 0, manualIds);
		SurchargeCalculationResult result = surchargeCalculator.calculate(input, applicable);

		long total = order.getTotalAmount() + result.total();
		long paid = order.getPaidAmount();
		List<CheckoutPreviewResponse.ManualSurchargeOption> options = applicable.stream()
				.filter(s -> s.getWhenType() == SurchargeWhenType.MANUAL)
				.map(s -> new CheckoutPreviewResponse.ManualSurchargeOption(s.getId(), s.getName(), s.getAmount()))
				.toList();
		return new CheckoutPreviewResponse(
				result.items().stream().map(i -> new OrderSurchargeDto(i.name(), i.amount())).toList(),
				total, paid, Math.max(0, total - paid), options);
	}

	/**
	 * Mức hoàn cọc mặc định nếu huỷ ngay bây giờ.
	 *
	 * @param orderId id đơn
	 * @return phần trăm và số tiền hoàn mặc định
	 */
	@Transactional(readOnly = true)
	public CancelPreviewResponse previewCancel(Long orderId) {
		RentalOrder order = findCancellableOrder(orderId);
		int percent = refundPercent(order.getCheckInAt(), LocalDateTime.now(clock));
		return new CancelPreviewResponse(percent, order.getDeposit() * percent / 100, order.getPaidAmount());
	}

	/**
	 * Huỷ đơn (không hoàn tác được). Nhân viên chỉ huỷ được đơn chưa thu gì ngoài cọc và không được
	 * sửa số tiền hoàn; số hoàn khác mức tự tính thì bắt buộc lý do.
	 *
	 * @param orderId id đơn
	 * @param request số tiền hoàn, lý do
	 * @param manager người thao tác có vai trò Quản lý không
	 * @return đơn sau khi huỷ
	 */
	@Transactional
	public OrderDto cancel(Long orderId, CancelRequest request, boolean manager) {
		RentalOrder order = findCancellableOrder(orderId);
		if (!manager && !order.getPayments().isEmpty()) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "Đơn đã thu tiền ngoài cọc, chỉ Quản lý được huỷ");
		}
		LocalDateTime now = LocalDateTime.now(clock);
		long defaultRefund = order.getDeposit() * refundPercent(order.getCheckInAt(), now) / 100;
		long refund = request.refundAmount();
		String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();
		if (refund != defaultRefund) {
			if (!manager) {
				throw new BusinessException(HttpStatus.FORBIDDEN, "Chỉ Quản lý được sửa số tiền hoàn");
			}
			if (reason == null) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "Phải nhập lý do khi sửa số tiền hoàn");
			}
		}
		if (refund > order.getPaidAmount()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Số tiền hoàn không được vượt số đã thu");
		}
		order.setStatus(OrderStatus.CANCELLED);
		order.setCancelledAt(now);
		order.setRefundAmount(refund);
		order.setCancelReason(reason);
		return OrderDto.from(orderRepository.save(order));
	}

	/**
	 * Phần trăm cọc được hoàn theo thời điểm huỷ: trước giờ nhận ≥ 24 giờ → 100; trong 24 giờ → 50;
	 * từ giờ nhận trở đi → 0.
	 */
	static int refundPercent(LocalDateTime checkInAt, LocalDateTime cancelAt) {
		if (!cancelAt.isAfter(checkInAt.minusHours(24))) {
			return 100;
		}
		return cancelAt.isBefore(checkInAt) ? 50 : 0;
	}

	/** Đơn huỷ được: Đã đặt, Đang ở, hoặc khách tự check-in không đến đã sang Chờ xác nhận trả. */
	private RentalOrder findCancellableOrder(Long orderId) {
		RentalOrder order = findOrder(orderId);
		boolean cancellable = order.getStatus() == OrderStatus.BOOKED || order.getStatus() == OrderStatus.CHECKED_IN
				|| (order.getStatus() == OrderStatus.PENDING_CHECKOUT && order.getCheckInMode() == CheckInMode.SELF);
		if (!cancellable) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Đơn ở trạng thái này không huỷ được");
		}
		return order;
	}

	private RentalOrder findStayingOrder(Long orderId) {
		RentalOrder order = findOrder(orderId);
		if (!STAYING.contains(order.getStatus())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chỉ trả phòng được đơn đang ở");
		}
		return order;
	}

	private RentalOrder findOrder(Long orderId) {
		return orderRepository.findById(orderId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Đơn không tồn tại"));
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
