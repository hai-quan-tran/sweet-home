package com.sweethome.schedule;

import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Ca mẫu (ví dụ Sáng 06:00–14:00). Giờ kết thúc ≤ giờ bắt đầu nghĩa là kết thúc vào hôm sau (ca đêm).
 * Xoá cứng được: ca đã xếp lưu bản sao tên/màu/giờ nên không đổi theo.
 */
@Entity
@Table(name = "shift_template")
public class ShiftTemplate extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 50)
	private String name;

	@Column(name = "start_time", nullable = false)
	private LocalTime startTime;

	@Column(name = "end_time", nullable = false)
	private LocalTime endTime;

	/** Số thứ tự màu hiển thị (1–6); 0 dành cho ca lẻ. */
	@Column(nullable = false)
	private int color;

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public LocalTime getStartTime() {
		return startTime;
	}

	public void setStartTime(LocalTime startTime) {
		this.startTime = startTime;
	}

	public LocalTime getEndTime() {
		return endTime;
	}

	public void setEndTime(LocalTime endTime) {
		this.endTime = endTime;
	}

	public int getColor() {
		return color;
	}

	public void setColor(int color) {
		this.color = color;
	}
}
