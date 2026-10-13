package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.List;

import com.sweethome.room.CheckInMode;

/**
 * Thông tin đầy đủ một đơn thuê. {@code code} dựng từ id ("SH-" + (1000 + id)), không lưu cột
 * riêng. {@code guestIdNumberMasked} che CCCD trừ 4 số cuối; mã cửa không trả qua DTO này, xem
 * riêng endpoint reveal.
 */
public record OrderDto(
		Long id,
		String code,
		OrderStatus status,
		Long roomId,
		String roomNumber,
		String roomName,
		String roomTypeNameSnapshot,
		RentalType rentalType,
		LocalDateTime checkInAt,
		LocalDateTime checkOutAt,
		LocalDateTime actualCheckInAt,
		LocalDateTime actualCheckOutAt,
		String guestName,
		String guestPhone,
		String guestIdNumberMasked,
		Integer guestCount,
		OrderSource source,
		String note,
		CheckInMode checkInMode,
		boolean hasDoorCode,
		long deposit,
		PaymentMethod depositMethod,
		long discount,
		String discountReason,
		long roomPriceAmount,
		List<OrderSurchargeDto> surcharges,
		long totalAmount,
		List<OrderPaymentDto> payments,
		long paidAmount,
		long dueAmount) {

	/** Mã đơn hiển thị, dựng từ id (không lưu cột riêng). */
	public static String codeOf(long id) {
		return "SH-" + (1000 + id);
	}

	public static OrderDto from(RentalOrder order) {
		String masked = order.getGuestIdNumberLast4() == null ? null : "•••••••• " + order.getGuestIdNumberLast4();
		return new OrderDto(
				order.getId(),
				codeOf(order.getId()),
				order.getStatus(),
				order.getRoom().getId(),
				order.getRoom().getRoomNumber(),
				order.getRoom().getName(),
				order.getRoomTypeNameSnapshot(),
				order.getRentalType(),
				order.getCheckInAt(),
				order.getCheckOutAt(),
				order.getActualCheckInAt(),
				order.getActualCheckOutAt(),
				order.getGuestName(),
				order.getGuestPhone(),
				masked,
				order.getGuestCount(),
				order.getSource(),
				order.getNote(),
				order.getCheckInMode(),
				order.getDoorCodeEncrypted() != null,
				order.getDeposit(),
				order.getPaymentMethod(),
				order.getDiscount(),
				order.getDiscountReason(),
				order.getRoomPriceAmount(),
				order.getSurcharges().stream().map(OrderSurchargeDto::from).toList(),
				order.getTotalAmount(),
				order.getPayments().stream().map(OrderPaymentDto::from).toList(),
				order.getPaidAmount(),
				Math.max(0, order.getTotalAmount() - order.getPaidAmount()));
	}
}
