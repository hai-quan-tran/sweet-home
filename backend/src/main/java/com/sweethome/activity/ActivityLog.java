package com.sweethome.activity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Một dòng nhật ký thao tác. Chỉ thêm, không sửa/xoá. Lưu số phòng dạng chuỗi (không tham chiếu) để giữ
 * đúng phòng tại thời điểm thao tác.
 */
@Entity
@Table(name = "activity_log")
public class ActivityLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	/** Tên đăng nhập người thao tác, "system" với tác vụ nền. */
	@Column(nullable = false, length = 50)
	private String actor;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private ActivityAction action;

	@Column(nullable = false)
	private String detail;

	@Column(name = "order_id")
	private Long orderId;

	@Column(name = "room_number", length = 20)
	private String roomNumber;

	public Long getId() {
		return id;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public String getActor() {
		return actor;
	}

	public void setActor(String actor) {
		this.actor = actor;
	}

	public ActivityAction getAction() {
		return action;
	}

	public void setAction(ActivityAction action) {
		this.action = action;
	}

	public String getDetail() {
		return detail;
	}

	public void setDetail(String detail) {
		this.detail = detail;
	}

	public Long getOrderId() {
		return orderId;
	}

	public void setOrderId(Long orderId) {
		this.orderId = orderId;
	}

	public String getRoomNumber() {
		return roomNumber;
	}

	public void setRoomNumber(String roomNumber) {
		this.roomNumber = roomNumber;
	}
}
