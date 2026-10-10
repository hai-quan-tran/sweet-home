package com.sweethome.room;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Hạng phòng: tên và bảng giá (2 giờ đầu, mỗi giờ thêm, qua đêm, theo ngày). Khung giờ áp dụng
 * chung cho mọi hạng nằm ở {@link PricingSettings}.
 */
@Entity
@Table(name = "room_type")
public class RoomType extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, unique = true, length = 100)
	private String name;

	@Column(name = "two_hour_price", nullable = false)
	private Long twoHourPrice;

	@Column(name = "extra_hour_price", nullable = false)
	private Long extraHourPrice;

	@Column(name = "overnight_price", nullable = false)
	private Long overnightPrice;

	@Column(name = "daily_price", nullable = false)
	private Long dailyPrice;

	@Column(nullable = false)
	private boolean active = true;

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public Long getTwoHourPrice() {
		return twoHourPrice;
	}

	public void setTwoHourPrice(Long twoHourPrice) {
		this.twoHourPrice = twoHourPrice;
	}

	public Long getExtraHourPrice() {
		return extraHourPrice;
	}

	public void setExtraHourPrice(Long extraHourPrice) {
		this.extraHourPrice = extraHourPrice;
	}

	public Long getOvernightPrice() {
		return overnightPrice;
	}

	public void setOvernightPrice(Long overnightPrice) {
		this.overnightPrice = overnightPrice;
	}

	public Long getDailyPrice() {
		return dailyPrice;
	}

	public void setDailyPrice(Long dailyPrice) {
		this.dailyPrice = dailyPrice;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}
}
