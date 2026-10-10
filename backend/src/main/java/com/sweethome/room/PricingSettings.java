package com.sweethome.room;

import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Khung giờ áp dụng chung cho mọi hạng phòng: số giờ tối thiểu tính "theo giờ", giờ nhận/trả
 * của loại qua đêm và theo ngày. Chỉ có đúng 1 dòng (id cố định bằng {@link #SINGLETON_ID}).
 */
@Entity
@Table(name = "pricing_settings")
public class PricingSettings extends Auditable {

	public static final long SINGLETON_ID = 1L;

	@Id
	private Long id = SINGLETON_ID;

	@Column(name = "min_hours", nullable = false)
	private Integer minHours;

	@Column(name = "overnight_check_in", nullable = false)
	private LocalTime overnightCheckIn;

	@Column(name = "overnight_check_out", nullable = false)
	private LocalTime overnightCheckOut;

	@Column(name = "daily_check_in", nullable = false)
	private LocalTime dailyCheckIn;

	@Column(name = "daily_check_out", nullable = false)
	private LocalTime dailyCheckOut;

	public Long getId() {
		return id;
	}

	public Integer getMinHours() {
		return minHours;
	}

	public void setMinHours(Integer minHours) {
		this.minHours = minHours;
	}

	public LocalTime getOvernightCheckIn() {
		return overnightCheckIn;
	}

	public void setOvernightCheckIn(LocalTime overnightCheckIn) {
		this.overnightCheckIn = overnightCheckIn;
	}

	public LocalTime getOvernightCheckOut() {
		return overnightCheckOut;
	}

	public void setOvernightCheckOut(LocalTime overnightCheckOut) {
		this.overnightCheckOut = overnightCheckOut;
	}

	public LocalTime getDailyCheckIn() {
		return dailyCheckIn;
	}

	public void setDailyCheckIn(LocalTime dailyCheckIn) {
		this.dailyCheckIn = dailyCheckIn;
	}

	public LocalTime getDailyCheckOut() {
		return dailyCheckOut;
	}

	public void setDailyCheckOut(LocalTime dailyCheckOut) {
		this.dailyCheckOut = dailyCheckOut;
	}
}
