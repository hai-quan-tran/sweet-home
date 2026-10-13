package com.sweethome.order;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.crypto.CryptoService;
import com.sweethome.common.error.BusinessException;
import com.sweethome.room.CheckInMode;
import com.sweethome.room.PricingSettings;
import com.sweethome.room.PricingSettingsRepository;
import com.sweethome.room.Room;
import com.sweethome.room.RoomPricingMode;
import com.sweethome.room.RoomRepository;
import com.sweethome.room.RoomType;
import com.sweethome.surcharge.Surcharge;
import com.sweethome.surcharge.SurchargeCalculationInput;
import com.sweethome.surcharge.SurchargeCalculationResult;
import com.sweethome.surcharge.SurchargeCalculator;
import com.sweethome.surcharge.SurchargeDayCharge;
import com.sweethome.surcharge.SurchargeRepository;

/**
 * Tạo đơn thuê và xem danh sách/chi tiết. Thu tiền xem {@link OrderPaymentService}.
 */
@Service
public class OrderService {

	private static final Pattern CODE_PATTERN = Pattern.compile("(?i)^SH-(\\d+)$");

	private final RentalOrderRepository orderRepository;
	private final RoomRepository roomRepository;
	private final PricingSettingsRepository pricingSettingsRepository;
	private final SurchargeRepository surchargeRepository;
	private final SurchargeCalculator surchargeCalculator;
	private final CryptoService cryptoService;

	public OrderService(RentalOrderRepository orderRepository, RoomRepository roomRepository,
			PricingSettingsRepository pricingSettingsRepository, SurchargeRepository surchargeRepository,
			SurchargeCalculator surchargeCalculator, CryptoService cryptoService) {
		this.orderRepository = orderRepository;
		this.roomRepository = roomRepository;
		this.pricingSettingsRepository = pricingSettingsRepository;
		this.surchargeRepository = surchargeRepository;
		this.surchargeCalculator = surchargeCalculator;
		this.cryptoService = cryptoService;
	}

	/**
	 * Danh sách đơn có lọc/tìm kiếm/phân trang, kèm số đơn theo từng trạng thái cho các tab.
	 *
	 * @param status trạng thái lọc, null nghĩa là mọi trạng thái
	 * @param roomId phòng lọc, null nghĩa là mọi phòng
	 * @param search tìm theo mã đơn, tên hoặc SĐT khách, null/rỗng nghĩa là không lọc
	 * @param page   trang (bắt đầu từ 0)
	 * @param size   kích thước trang
	 * @return trang kết quả
	 */
	@Transactional(readOnly = true)
	public OrderListResponse list(OrderStatus status, Long roomId, String search, int page, int size) {
		String normalizedSearch = search == null ? "" : search.trim().toLowerCase();
		Long searchId = parseCodeToId(normalizedSearch);
		Page<RentalOrder> result = orderRepository.search(status, roomId, normalizedSearch, searchId,
				PageRequest.of(page, size));
		Map<OrderStatus, Long> counts = new EnumMap<>(OrderStatus.class);
		for (OrderStatus s : OrderStatus.values()) {
			counts.put(s, 0L);
		}
		for (Object[] row : orderRepository.countByStatus(roomId, normalizedSearch, searchId)) {
			counts.put((OrderStatus) row[0], (Long) row[1]);
		}
		return new OrderListResponse(result.getContent().stream().map(OrderDto::from).toList(),
				result.getTotalElements(), counts);
	}

	/**
	 * Chi tiết một đơn.
	 *
	 * @param id id đơn
	 * @return thông tin đơn
	 */
	@Transactional(readOnly = true)
	public OrderDto get(Long id) {
		return OrderDto.from(findOrder(id));
	}

	/**
	 * Mã cửa đã giải mã của một đơn, dùng cho nút "Hiện" và chèn vào tin nhắn gửi khách.
	 *
	 * @param id id đơn
	 * @return mã cửa, null nếu đơn không có
	 */
	@Transactional(readOnly = true)
	public DoorCodeResponse getDoorCode(Long id) {
		RentalOrder order = findOrder(id);
		return new DoorCodeResponse(cryptoService.decrypt(order.getDoorCodeEncrypted()));
	}

	/**
	 * Xem trước giờ nhận/trả, phòng có trống không và tiền tạm tính — không lưu DB. Dùng cho màn
	 * Tạo đơn tự cập nhật khi người dùng đổi phòng/loại thuê/giờ.
	 *
	 * @param request dữ liệu đang điền
	 * @return kết quả xem trước
	 */
	@Transactional(readOnly = true)
	public OrderPreviewResponse preview(OrderPreviewRequest request) {
		Room room = findRoom(request.roomId());
		PricingSettings settings = pricingSettings();
		RoomPrices prices = effectivePrices(room);
		Schedule schedule = computeSchedule(request.rentalType(), request.checkInDate(), request.checkInTime(),
				request.quantity(), settings, prices);

		List<RentalOrder> conflicts = orderRepository.findOverlapping(room.getId(), schedule.checkInAt(),
				schedule.checkOutAt());
		boolean available = conflicts.isEmpty();
		String conflictMessage = available ? null
				: "Phòng đã có đơn %s trong khung giờ này".formatted(OrderDto.codeOf(conflicts.get(0).getId()));

		SurchargeCalculationResult surcharges = calculateSurcharges(room, prices, schedule, request.guestCount(),
				Set.of());
		long total = Math.max(0, schedule.roomPrice() + surcharges.total() - request.discount());
		long due = Math.max(0, total - request.deposit());

		return new OrderPreviewResponse(schedule.checkInAt(), schedule.checkOutAt(), available, conflictMessage,
				schedule.roomPrice(), surcharges.items().stream().map(i -> new OrderSurchargeDto(i.name(), i.amount())).toList(),
				total, due);
	}

	/**
	 * Tạo đơn thuê mới.
	 *
	 * @param request dữ liệu đơn
	 * @return đơn vừa tạo
	 */
	@Transactional
	public OrderDto create(OrderUpsertRequest request) {
		Room room = findRoom(request.roomId());
		if (!room.isAcceptingBookings()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Phòng đang tắt nhận đặt, không tạo được đơn mới");
		}
		if (request.checkInMode() == CheckInMode.SELF
				&& (request.doorCode() == null || request.doorCode().isBlank())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Phải nhập mã cửa khi khách tự check-in");
		}

		PricingSettings settings = pricingSettings();
		RoomPrices prices = effectivePrices(room);
		Schedule schedule = computeSchedule(request.rentalType(), request.checkInDate(), request.checkInTime(),
				request.quantity(), settings, prices);

		List<RentalOrder> conflicts = orderRepository.findOverlapping(room.getId(), schedule.checkInAt(),
				schedule.checkOutAt());
		if (!conflicts.isEmpty()) {
			throw new BusinessException(HttpStatus.CONFLICT,
					"Phòng đã có đơn %s trong khung giờ này".formatted(OrderDto.codeOf(conflicts.get(0).getId())));
		}

		SurchargeCalculationResult surcharges = calculateSurcharges(room, prices, schedule, request.guestCount(),
				Set.of());
		long total = Math.max(0, schedule.roomPrice() + surcharges.total() - request.discount());
		if (request.deposit() > total) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Tiền cọc không được vượt tổng tiền");
		}

		RentalOrder order = new RentalOrder();
		order.setRoom(room);
		order.setRentalType(request.rentalType());
		order.setCheckInAt(schedule.checkInAt());
		order.setCheckOutAt(schedule.checkOutAt());
		order.setGuestName(request.guestName());
		order.setGuestPhone(request.guestPhone());
		if (request.guestIdNumber() != null && !request.guestIdNumber().isBlank()) {
			String digitsOnly = request.guestIdNumber().replaceAll("\\s+", "");
			order.setGuestIdNumberEncrypted(cryptoService.encrypt(digitsOnly));
			order.setGuestIdNumberLast4(digitsOnly.length() <= 4 ? digitsOnly : digitsOnly.substring(digitsOnly.length() - 4));
		}
		order.setGuestCount(request.guestCount());
		order.setSource(request.source());
		order.setNote(request.note());
		order.setCheckInMode(request.checkInMode());
		if (request.doorCode() != null && !request.doorCode().isBlank()) {
			order.setDoorCodeEncrypted(cryptoService.encrypt(request.doorCode()));
		}
		order.setDeposit(request.deposit());
		order.setPaymentMethod(request.depositMethod());
		order.setDiscount(request.discount());
		order.setDiscountReason(request.discountReason());
		order.setRoomTypeNameSnapshot(prices.roomTypeName());
		order.setTwoHourPriceSnapshot(prices.twoHour());
		order.setExtraHourPriceSnapshot(prices.extraHour());
		order.setOvernightPriceSnapshot(prices.overnight());
		order.setDailyPriceSnapshot(prices.daily());
		order.setRoomPriceAmount(schedule.roomPrice());
		order.setTotalAmount(total);
		List<OrderSurcharge> surchargeRows = new ArrayList<>();
		for (var item : surcharges.items()) {
			OrderSurcharge row = new OrderSurcharge();
			row.setName(item.name());
			row.setAmount(item.amount());
			surchargeRows.add(row);
		}
		order.setSurcharges(surchargeRows);

		return OrderDto.from(orderRepository.save(order));
	}

	private SurchargeCalculationResult calculateSurcharges(Room room, RoomPrices prices, Schedule schedule,
			int guestCount, Set<Long> manualSurchargeIds) {
		List<Surcharge> applicable = surchargeRepository.findActiveByRoomTypeId(room.getRoomType().getId());
		int extraGuests = Math.max(0, guestCount - room.getMaxGuests());
		SurchargeCalculationInput input = new SurchargeCalculationInput(schedule.stayDays(), prices.extraHour(),
				null, null, extraGuests, manualSurchargeIds);
		return surchargeCalculator.calculate(input, applicable);
	}

	/** Giờ nhận/trả và tiền phòng theo loại thuê, dựa trên khung giờ chung và giá áp dụng cho phòng. */
	private Schedule computeSchedule(RentalType rentalType, LocalDate checkInDate, LocalTime checkInTime,
			Integer quantity, PricingSettings settings, RoomPrices prices) {
		return switch (rentalType) {
			case HOURLY -> {
				if (checkInTime == null) {
					throw new BusinessException(HttpStatus.BAD_REQUEST, "Phải nhập giờ nhận phòng cho đơn theo giờ");
				}
				int hours = quantity != null ? quantity : settings.getMinHours();
				if (hours < settings.getMinHours()) {
					throw new BusinessException(HttpStatus.BAD_REQUEST,
							"Số giờ thuê tối thiểu %d giờ".formatted(settings.getMinHours()));
				}
				LocalDateTime checkIn = LocalDateTime.of(checkInDate, checkInTime);
				LocalDateTime checkOut = checkIn.plusHours(hours);
				long price = prices.twoHour() + Math.max(0, hours - settings.getMinHours()) * prices.extraHour();
				yield new Schedule(checkIn, checkOut, price, List.of(new SurchargeDayCharge(checkInDate, price)));
			}
			case OVERNIGHT -> {
				LocalDateTime checkIn = LocalDateTime.of(checkInDate, settings.getOvernightCheckIn());
				LocalDateTime checkOut = LocalDateTime.of(checkInDate.plusDays(1), settings.getOvernightCheckOut());
				long price = prices.overnight();
				yield new Schedule(checkIn, checkOut, price, List.of(new SurchargeDayCharge(checkInDate, price)));
			}
			case DAILY -> {
				int days = quantity != null ? quantity : 1;
				if (days < 1) {
					throw new BusinessException(HttpStatus.BAD_REQUEST, "Số ngày thuê tối thiểu 1 ngày");
				}
				LocalDateTime checkIn = LocalDateTime.of(checkInDate, settings.getDailyCheckIn());
				LocalDateTime checkOut = LocalDateTime.of(checkInDate.plusDays(days), settings.getDailyCheckOut());
				long price = prices.daily() * days;
				List<SurchargeDayCharge> stayDays = IntStream.range(0, days)
						.mapToObj(i -> new SurchargeDayCharge(checkInDate.plusDays(i), prices.daily())).toList();
				yield new Schedule(checkIn, checkOut, price, stayDays);
			}
		};
	}

	/** Giá áp dụng cho phòng (theo hạng hoặc giá riêng), giống logic {@code RoomDto.from}. */
	private RoomPrices effectivePrices(Room room) {
		RoomType type = room.getRoomType();
		boolean own = room.getPricingMode() == RoomPricingMode.OWN;
		return new RoomPrices(type.getName(),
				own ? room.getOwnTwoHourPrice() : type.getTwoHourPrice(),
				own ? room.getOwnExtraHourPrice() : type.getExtraHourPrice(),
				own ? room.getOwnOvernightPrice() : type.getOvernightPrice(),
				own ? room.getOwnDailyPrice() : type.getDailyPrice());
	}

	private Long parseCodeToId(String search) {
		Matcher matcher = CODE_PATTERN.matcher(search);
		if (!matcher.matches()) {
			return -1L;
		}
		long value = Long.parseLong(matcher.group(1)) - 1000;
		return value > 0 ? value : -1L;
	}

	private PricingSettings pricingSettings() {
		return pricingSettingsRepository.findById(PricingSettings.SINGLETON_ID)
				.orElseThrow(() -> new IllegalStateException("Thiếu dữ liệu khung giờ mặc định"));
	}

	private Room findRoom(Long id) {
		return roomRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Phòng không tồn tại"));
	}

	private RentalOrder findOrder(Long id) {
		return orderRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Đơn không tồn tại"));
	}

	private record RoomPrices(String roomTypeName, long twoHour, long extraHour, long overnight, long daily) {
	}

	private record Schedule(LocalDateTime checkInAt, LocalDateTime checkOutAt, long roomPrice,
			List<SurchargeDayCharge> stayDays) {
	}
}
