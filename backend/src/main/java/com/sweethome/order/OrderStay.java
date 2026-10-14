package com.sweethome.order;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.sweethome.room.Room;

/**
 * Một chặng của đơn: khách ở phòng nào, từ giờ nào đến giờ nào. Đơn thường có 1 chặng; gia hạn mà
 * phải chuyển phòng thì thêm chặng mới. Kiểm tra trùng lịch và lịch đặt phòng dựa trên chặng.
 */
@Entity
@Table(name = "order_stay")
public class OrderStay {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "order_id", nullable = false)
	private RentalOrder order;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_id", nullable = false)
	private Room room;

	@Column(name = "start_at", nullable = false)
	private LocalDateTime startAt;

	@Column(name = "end_at", nullable = false)
	private LocalDateTime endAt;

	/** Đã chuyển phòng của chặng sang Chờ dọn khi khách chuyển đi (chỉ xét chặng không phải chặng cuối). */
	@Column(name = "cleaning_requested", nullable = false)
	private boolean cleaningRequested;

	protected OrderStay() {
	}

	/**
	 * Tạo chặng mới.
	 *
	 * @param room    phòng khách ở
	 * @param startAt giờ bắt đầu chặng
	 * @param endAt   giờ kết thúc chặng
	 */
	public OrderStay(Room room, LocalDateTime startAt, LocalDateTime endAt) {
		this.room = room;
		this.startAt = startAt;
		this.endAt = endAt;
	}

	public Long getId() {
		return id;
	}

	public RentalOrder getOrder() {
		return order;
	}

	void setOrder(RentalOrder order) {
		this.order = order;
	}

	public Room getRoom() {
		return room;
	}

	public LocalDateTime getStartAt() {
		return startAt;
	}

	public LocalDateTime getEndAt() {
		return endAt;
	}

	public void setEndAt(LocalDateTime endAt) {
		this.endAt = endAt;
	}

	public boolean isCleaningRequested() {
		return cleaningRequested;
	}

	public void setCleaningRequested(boolean cleaningRequested) {
		this.cleaningRequested = cleaningRequested;
	}
}
