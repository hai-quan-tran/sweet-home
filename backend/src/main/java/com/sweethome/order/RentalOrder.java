package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;
import com.sweethome.room.CheckInMode;
import com.sweethome.room.Room;

/**
 * Một đơn thuê. Lưu snapshot tên hạng phòng + 4 mức giá và giá phòng/tổng tiền đã tính ngay lúc
 * tạo, tách biệt khỏi {@code RoomType}/{@code Surcharge} gốc — sửa hoặc ẩn hạng phòng/phụ thu sau
 * đó không làm đổi đơn cũ (xem {@code business-rules.md} mục "Xoá mềm & lưu lịch sử").
 * <p>
 * Tiền cọc lưu trên đơn, các khoản thu thêm lưu ở {@link OrderPayment}.
 */
@Entity
@Table(name = "rental_order")
public class RentalOrder extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrderStatus status = OrderStatus.BOOKED;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_id", nullable = false)
	private Room room;

	@Enumerated(EnumType.STRING)
	@Column(name = "rental_type", nullable = false, length = 20)
	private RentalType rentalType;

	@Column(name = "check_in_at", nullable = false)
	private LocalDateTime checkInAt;

	@Column(name = "check_out_at", nullable = false)
	private LocalDateTime checkOutAt;

	/** Giờ nhận phòng thực tế; null khi chưa nhận. */
	@Column(name = "actual_check_in_at")
	private LocalDateTime actualCheckInAt;

	/** Giờ trả phòng thực tế; null khi chưa trả. */
	@Column(name = "actual_check_out_at")
	private LocalDateTime actualCheckOutAt;

	/** Thời điểm huỷ; null khi chưa huỷ. */
	@Column(name = "cancelled_at")
	private LocalDateTime cancelledAt;

	/** Số tiền hoàn cho khách khi huỷ. */
	@Column(name = "refund_amount")
	private Long refundAmount;

	@Column(name = "cancel_reason", length = 255)
	private String cancelReason;

	@Column(name = "guest_name", nullable = false, length = 100)
	private String guestName;

	@Column(name = "guest_phone", nullable = false, length = 20)
	private String guestPhone;

	/** CCCD/hộ chiếu mã hoá AES; null nếu khách không cung cấp. */
	@Column(name = "guest_id_number_encrypted", length = 255)
	private String guestIdNumberEncrypted;

	/** 4 ký tự cuối CCCD/hộ chiếu, lưu riêng (không mã hoá) để hiển thị dạng che mà không phải giải mã. */
	@Column(name = "guest_id_number_last4", length = 4)
	private String guestIdNumberLast4;

	@Column(name = "guest_count", nullable = false)
	private Integer guestCount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OrderSource source;

	@Column(length = 1000)
	private String note;

	@Enumerated(EnumType.STRING)
	@Column(name = "check_in_mode", nullable = false, length = 20)
	private CheckInMode checkInMode;

	/** Mã cửa riêng cho đơn, mã hoá AES; null nếu {@code checkInMode == STAFF}. */
	@Column(name = "door_code_encrypted", length = 255)
	private String doorCodeEncrypted;

	@Column(nullable = false)
	private long deposit = 0;

	@Enumerated(EnumType.STRING)
	@Column(name = "deposit_method", length = 20)
	private PaymentMethod depositMethod;

	@Column(nullable = false)
	private long discount = 0;

	@Column(name = "discount_reason", length = 255)
	private String discountReason;

	@Column(name = "room_type_name_snapshot", nullable = false, length = 100)
	private String roomTypeNameSnapshot;

	@Column(name = "two_hour_price_snapshot", nullable = false)
	private long twoHourPriceSnapshot;

	@Column(name = "extra_hour_price_snapshot", nullable = false)
	private long extraHourPriceSnapshot;

	@Column(name = "overnight_price_snapshot", nullable = false)
	private long overnightPriceSnapshot;

	@Column(name = "daily_price_snapshot", nullable = false)
	private long dailyPriceSnapshot;

	@Column(name = "room_price_amount", nullable = false)
	private long roomPriceAmount;

	@Column(name = "total_amount", nullable = false)
	private long totalAmount;

	@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("id asc")
	private List<OrderSurcharge> surcharges = new ArrayList<>();

	@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("id asc")
	private List<OrderPayment> payments = new ArrayList<>();

	@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("startAt asc")
	private List<OrderStay> stays = new ArrayList<>();

	public Long getId() {
		return id;
	}

	public OrderStatus getStatus() {
		return status;
	}

	public void setStatus(OrderStatus status) {
		this.status = status;
	}

	public Room getRoom() {
		return room;
	}

	public void setRoom(Room room) {
		this.room = room;
	}

	public RentalType getRentalType() {
		return rentalType;
	}

	public void setRentalType(RentalType rentalType) {
		this.rentalType = rentalType;
	}

	public LocalDateTime getCheckInAt() {
		return checkInAt;
	}

	public void setCheckInAt(LocalDateTime checkInAt) {
		this.checkInAt = checkInAt;
	}

	public LocalDateTime getCheckOutAt() {
		return checkOutAt;
	}

	public void setCheckOutAt(LocalDateTime checkOutAt) {
		this.checkOutAt = checkOutAt;
	}

	public LocalDateTime getActualCheckInAt() {
		return actualCheckInAt;
	}

	public void setActualCheckInAt(LocalDateTime actualCheckInAt) {
		this.actualCheckInAt = actualCheckInAt;
	}

	public LocalDateTime getActualCheckOutAt() {
		return actualCheckOutAt;
	}

	public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) {
		this.actualCheckOutAt = actualCheckOutAt;
	}

	public LocalDateTime getCancelledAt() {
		return cancelledAt;
	}

	public void setCancelledAt(LocalDateTime cancelledAt) {
		this.cancelledAt = cancelledAt;
	}

	public Long getRefundAmount() {
		return refundAmount;
	}

	public void setRefundAmount(Long refundAmount) {
		this.refundAmount = refundAmount;
	}

	public String getCancelReason() {
		return cancelReason;
	}

	public void setCancelReason(String cancelReason) {
		this.cancelReason = cancelReason;
	}

	public String getGuestName() {
		return guestName;
	}

	public void setGuestName(String guestName) {
		this.guestName = guestName;
	}

	public String getGuestPhone() {
		return guestPhone;
	}

	public void setGuestPhone(String guestPhone) {
		this.guestPhone = guestPhone;
	}

	public String getGuestIdNumberEncrypted() {
		return guestIdNumberEncrypted;
	}

	public void setGuestIdNumberEncrypted(String guestIdNumberEncrypted) {
		this.guestIdNumberEncrypted = guestIdNumberEncrypted;
	}

	public String getGuestIdNumberLast4() {
		return guestIdNumberLast4;
	}

	public void setGuestIdNumberLast4(String guestIdNumberLast4) {
		this.guestIdNumberLast4 = guestIdNumberLast4;
	}

	public Integer getGuestCount() {
		return guestCount;
	}

	public void setGuestCount(Integer guestCount) {
		this.guestCount = guestCount;
	}

	public OrderSource getSource() {
		return source;
	}

	public void setSource(OrderSource source) {
		this.source = source;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}

	public CheckInMode getCheckInMode() {
		return checkInMode;
	}

	public void setCheckInMode(CheckInMode checkInMode) {
		this.checkInMode = checkInMode;
	}

	public String getDoorCodeEncrypted() {
		return doorCodeEncrypted;
	}

	public void setDoorCodeEncrypted(String doorCodeEncrypted) {
		this.doorCodeEncrypted = doorCodeEncrypted;
	}

	public long getDeposit() {
		return deposit;
	}

	public void setDeposit(long deposit) {
		this.deposit = deposit;
	}

	public PaymentMethod getDepositMethod() {
		return depositMethod;
	}

	public void setDepositMethod(PaymentMethod depositMethod) {
		this.depositMethod = depositMethod;
	}

	public long getDiscount() {
		return discount;
	}

	public void setDiscount(long discount) {
		this.discount = discount;
	}

	public String getDiscountReason() {
		return discountReason;
	}

	public void setDiscountReason(String discountReason) {
		this.discountReason = discountReason;
	}

	public String getRoomTypeNameSnapshot() {
		return roomTypeNameSnapshot;
	}

	public void setRoomTypeNameSnapshot(String roomTypeNameSnapshot) {
		this.roomTypeNameSnapshot = roomTypeNameSnapshot;
	}

	public long getTwoHourPriceSnapshot() {
		return twoHourPriceSnapshot;
	}

	public void setTwoHourPriceSnapshot(long twoHourPriceSnapshot) {
		this.twoHourPriceSnapshot = twoHourPriceSnapshot;
	}

	public long getExtraHourPriceSnapshot() {
		return extraHourPriceSnapshot;
	}

	public void setExtraHourPriceSnapshot(long extraHourPriceSnapshot) {
		this.extraHourPriceSnapshot = extraHourPriceSnapshot;
	}

	public long getOvernightPriceSnapshot() {
		return overnightPriceSnapshot;
	}

	public void setOvernightPriceSnapshot(long overnightPriceSnapshot) {
		this.overnightPriceSnapshot = overnightPriceSnapshot;
	}

	public long getDailyPriceSnapshot() {
		return dailyPriceSnapshot;
	}

	public void setDailyPriceSnapshot(long dailyPriceSnapshot) {
		this.dailyPriceSnapshot = dailyPriceSnapshot;
	}

	public long getRoomPriceAmount() {
		return roomPriceAmount;
	}

	public void setRoomPriceAmount(long roomPriceAmount) {
		this.roomPriceAmount = roomPriceAmount;
	}

	public long getTotalAmount() {
		return totalAmount;
	}

	public void setTotalAmount(long totalAmount) {
		this.totalAmount = totalAmount;
	}

	public List<OrderSurcharge> getSurcharges() {
		return surcharges;
	}

	/** Thay toàn bộ danh sách phụ thu đã tính, giữ nguyên quan hệ 2 chiều cho cascade. */
	public void setSurcharges(List<OrderSurcharge> surcharges) {
		this.surcharges.clear();
		if (surcharges != null) {
			for (OrderSurcharge s : surcharges) {
				s.setOrder(this);
				this.surcharges.add(s);
			}
		}
	}

	public List<OrderPayment> getPayments() {
		return payments;
	}

	/** Thêm một dòng phụ thu (khi trả phòng), gắn quan hệ 2 chiều cho cascade. */
	public void addSurcharge(OrderSurcharge surcharge) {
		surcharge.setOrder(this);
		surcharges.add(surcharge);
	}

	/** Thêm một khoản thu, gắn quan hệ 2 chiều cho cascade. */
	public void addPayment(OrderPayment payment) {
		payment.setOrder(this);
		payments.add(payment);
	}

	public List<OrderStay> getStays() {
		return stays;
	}

	/**
	 * Đặt lịch đơn ở đúng 1 phòng (tạo/sửa đơn): ghi phòng, giờ nhận/trả và thay mọi chặng bằng 1
	 * chặng tương ứng, giữ phòng/giờ của đơn luôn khớp với chặng.
	 *
	 * @param room       phòng
	 * @param checkInAt  giờ nhận
	 * @param checkOutAt giờ trả
	 */
	public void scheduleSingleStay(Room room, LocalDateTime checkInAt, LocalDateTime checkOutAt) {
		this.room = room;
		this.checkInAt = checkInAt;
		this.checkOutAt = checkOutAt;
		stays.clear();
		OrderStay stay = new OrderStay(room, checkInAt, checkOutAt);
		stay.setOrder(this);
		stays.add(stay);
	}

	/**
	 * Gia hạn tại phòng đang ở: dời giờ trả của đơn và của chặng cuối.
	 *
	 * @param newCheckOutAt giờ trả mới
	 */
	public void extendTo(LocalDateTime newCheckOutAt) {
		this.checkOutAt = newCheckOutAt;
		stays.getLast().setEndAt(newCheckOutAt);
	}

	/**
	 * Gia hạn bằng cách chuyển sang phòng khác: thêm chặng mới từ giờ trả hiện tại đến giờ trả mới,
	 * phòng của đơn thành phòng mới.
	 *
	 * @param newRoom       phòng chuyển sang
	 * @param newCheckOutAt giờ trả mới
	 */
	public void moveTo(Room newRoom, LocalDateTime newCheckOutAt) {
		OrderStay stay = new OrderStay(newRoom, checkOutAt, newCheckOutAt);
		stay.setOrder(this);
		stays.add(stay);
		this.room = newRoom;
		this.checkOutAt = newCheckOutAt;
	}

	/** Tổng đã thu = tiền cọc + các khoản thu thêm. */
	public long getPaidAmount() {
		return deposit + payments.stream().mapToLong(OrderPayment::getAmount).sum();
	}
}
