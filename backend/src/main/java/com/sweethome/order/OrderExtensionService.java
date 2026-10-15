package com.sweethome.order;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.activity.ActivityAction;
import com.sweethome.activity.ActivityLogService;
import com.sweethome.common.error.BusinessException;
import com.sweethome.room.Room;
import com.sweethome.room.RoomRepository;

/**
 * Gia hạn đơn đang ở: thêm giờ (giá mỗi giờ thêm) hoặc thêm ngày (giá ngày), giờ trả mới phải cách
 * đơn kế tiếp của phòng ít nhất 1 tiếng. Không giữ được phòng thì chuyển khách sang phòng cùng giá,
 * đã dọn, trống suốt thời gian gia hạn — đơn thêm chặng mới (xem {@code business-rules.md} mục Gia hạn).
 */
@Service
public class OrderExtensionService {

	/** Khoảng trống tối thiểu giữa giờ trả mới và giờ nhận của đơn kế tiếp. */
	static final Duration GAP_BEFORE_NEXT = Duration.ofHours(1);

	private static final Set<OrderStatus> STAYING = Set.of(OrderStatus.CHECKED_IN, OrderStatus.OVERSTAY,
			OrderStatus.PENDING_CHECKOUT);

	private final RentalOrderRepository orderRepository;
	private final RoomRepository roomRepository;
	private final Clock clock;
	private final ActivityLogService activityLog;

	public OrderExtensionService(RentalOrderRepository orderRepository, RoomRepository roomRepository, Clock clock,
			ActivityLogService activityLog) {
		this.orderRepository = orderRepository;
		this.roomRepository = roomRepository;
		this.clock = clock;
		this.activityLog = activityLog;
	}

	/**
	 * Xem trước gia hạn: giờ trả mới, phí, đơn kế tiếp, giới hạn giữ phòng và (khi không giữ được)
	 * các phòng có thể chuyển sang. Không lưu DB.
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
	 * Gia hạn: tại phòng đang ở nếu giữ được, không thì chuyển sang {@code targetRoomId} (phải nằm trong
	 * danh sách phòng chuyển được). Thêm dòng phí "Gia hạn +…", thu ngay nếu chọn; đơn Quá giờ/Chờ xác
	 * nhận trả quay về Đang ở.
	 *
	 * @param orderId id đơn
	 * @param request kiểu, số lượng, cách thu tiền, phòng chuyển sang
	 * @return đơn sau khi gia hạn
	 */
	@Transactional
	public OrderDto extend(Long orderId, ExtendRequest request) {
		RentalOrder order = findStayingOrder(orderId);
		ExtendPreviewResponse preview = compute(order, request);
		if (request.collectNow() && request.paymentMethod() == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chọn hình thức thu phí gia hạn");
		}
		if (preview.available()) {
			order.extendTo(preview.newCheckOutAt());
		} else {
			if (request.targetRoomId() == null) {
				throw new BusinessException(HttpStatus.CONFLICT, "Phòng chỉ giữ được đến %s vì đơn %s nhận phòng lúc %s"
						.formatted(preview.maxCheckOutAt().toLocalTime(), preview.nextOrder().code(),
								preview.nextOrder().checkInAt().toLocalTime()));
			}
			boolean allowed = preview.moveOptions().stream().anyMatch(o -> o.roomId().equals(request.targetRoomId()));
			if (!allowed) {
				throw new BusinessException(HttpStatus.CONFLICT, "Phòng được chọn không chuyển sang được");
			}
			order.moveTo(roomRepository.getReferenceById(request.targetRoomId()), preview.newCheckOutAt());
		}
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
		String detail = fee.getName() + (preview.available() ? "" : ", chuyển sang phòng " + order.getRoom().getRoomNumber())
				+ (request.collectNow() ? ", thu %s %s".formatted(ActivityLogService.money(preview.fee()), request.paymentMethod().label()) : "");
		activityLog.log(ActivityAction.ORDER_EXTENDED, orderId, order.getRoom().getRoomNumber(), detail);
		// Tác vụ mỗi phút sẽ chuyển lại Quá giờ/Chờ xác nhận nếu giờ trả mới vẫn đã qua.
		order.setStatus(OrderStatus.CHECKED_IN);
		return OrderDto.from(orderRepository.saveAndFlush(order));
	}

	/**
	 * Tác vụ mỗi phút: chặng khách đã chuyển đi kết thúc thì phòng của chặng đó sang Chờ dọn (một lần).
	 *
	 * @return số phòng vừa chuyển Chờ dọn
	 */
	@Transactional
	public int releaseMovedOutRooms() {
		List<OrderStay> stays = orderRepository.findMovedOutStaysToRelease(LocalDateTime.now(clock));
		for (OrderStay stay : stays) {
			stay.getRoom().setNeedsCleaning(true);
			stay.setCleaningRequested(true);
		}
		return stays.size();
	}

	/** Tính giờ trả mới, phí, giới hạn theo đơn kế tiếp ở phòng đang ở và phòng chuyển được nếu cần. */
	private ExtendPreviewResponse compute(RentalOrder order, ExtendRequest request) {
		LocalDateTime currentOut = order.getCheckOutAt();
		boolean hourly = request.type() == ExtendType.HOUR;
		LocalDateTime newOut = hourly ? currentOut.plusHours(request.quantity()) : currentOut.plusDays(request.quantity());
		long unitPrice = hourly ? order.getExtraHourPriceSnapshot() : order.getDailyPriceSnapshot();

		OrderStay next = nextStay(order.getRoom(), order.getId(), currentOut);
		ExtendPreviewResponse.NextOrder nextOrder = null;
		LocalDateTime maxOut = null;
		Integer maxExtraHours = null;
		if (next != null) {
			nextOrder = new ExtendPreviewResponse.NextOrder(OrderDto.codeOf(next.getOrder().getId()),
					next.getOrder().getGuestName(), next.getStartAt());
			maxOut = next.getStartAt().minus(GAP_BEFORE_NEXT);
			maxExtraHours = (int) Math.max(0, Duration.between(currentOut, maxOut).toHours());
		}
		boolean available = maxOut == null || !newOut.isAfter(maxOut);
		return new ExtendPreviewResponse(order.getExtraHourPriceSnapshot(), order.getDailyPriceSnapshot(), currentOut,
				newOut, unitPrice * request.quantity(), nextOrder, maxOut, maxExtraHours, available,
				available ? List.of() : moveOptions(order, currentOut, newOut));
	}

	/**
	 * Phòng chuyển khách sang được: khác phòng đang ở, cùng 4 mức giá, đang nhận đặt, đã dọn, không có
	 * đơn nào từ giờ trả hiện tại đến giờ trả mới + 1 tiếng.
	 */
	private List<ExtendPreviewResponse.MoveOption> moveOptions(RentalOrder order, LocalDateTime from, LocalDateTime to) {
		Room current = order.getRoom();
		List<Long> prices = current.effectivePrices();
		return roomRepository.findAll().stream()
				.filter(r -> !r.getId().equals(current.getId()) && r.isAcceptingBookings() && !r.isNeedsCleaning()
						&& r.effectivePrices().equals(prices))
				.filter(r -> orderRepository.findOverlapping(r.getId(), from, to.plus(GAP_BEFORE_NEXT)).isEmpty())
				.sorted(Comparator.comparing(Room::getRoomNumber))
				.map(r -> {
					OrderStay next = nextStay(r, order.getId(), from);
					return new ExtendPreviewResponse.MoveOption(r.getId(), r.getRoomNumber(), r.getName(), r.getMaxGuests(),
							next == null ? null : next.getStartAt());
				})
				.toList();
	}

	/** Chặng sớm nhất của đơn khác ở phòng bắt đầu từ {@code from} trở đi, null nếu không có. */
	private OrderStay nextStay(Room room, Long orderId, LocalDateTime from) {
		return orderRepository.findStaysStartingFrom(room.getId(), orderId, from, PageRequest.of(0, 1)).stream()
				.findFirst().orElse(null);
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
