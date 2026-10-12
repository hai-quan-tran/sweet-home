package com.sweethome.surcharge;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;
import com.sweethome.room.RoomType;

/**
 * Cấu hình một phụ thu. Tuỳ {@link #whenType}, chỉ một số trường dưới đây có nghĩa: xem
 * {@link SurchargeWhenType}. Xoá mềm qua {@link #active} giống {@code RoomType} ở GĐ2.
 */
@Entity
@Table(name = "surcharge")
public class Surcharge extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(name = "when_type", nullable = false, length = 20)
	@Enumerated(EnumType.STRING)
	private SurchargeWhenType whenType;

	/** % (WEEKDAY, DATE_RANGE) hoặc số tiền (EXTRA_GUEST, MANUAL). Null nếu OVERSTAY. */
	@Column(name = "amount")
	private Long amount;

	/** Phút ân hạn trước khi tính quá giờ. Chỉ dùng khi {@code whenType == OVERSTAY}. */
	@Column(name = "grace_minutes")
	private Integer graceMinutes;

	/** Các ngày trong tuần áp dụng. Chỉ dùng khi {@code whenType == WEEKDAY}. */
	@ElementCollection
	@CollectionTable(name = "surcharge_weekday", joinColumns = @JoinColumn(name = "surcharge_id"))
	@Column(name = "weekday", nullable = false, length = 10)
	@Enumerated(EnumType.STRING)
	private Set<DayOfWeek> weekdays = new HashSet<>();

	/** Các khoảng ngày áp dụng. Chỉ dùng khi {@code whenType == DATE_RANGE}. */
	@OneToMany(mappedBy = "surcharge", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("id ASC")
	private List<SurchargeDateRange> dateRanges = new ArrayList<>();

	/** Hạng phòng áp dụng phụ thu này. */
	@ManyToMany(fetch = FetchType.LAZY)
	@JoinTable(name = "surcharge_room_type", joinColumns = @JoinColumn(name = "surcharge_id"),
			inverseJoinColumns = @JoinColumn(name = "room_type_id"))
	private Set<RoomType> roomTypes = new HashSet<>();

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

	public SurchargeWhenType getWhenType() {
		return whenType;
	}

	public void setWhenType(SurchargeWhenType whenType) {
		this.whenType = whenType;
	}

	public Long getAmount() {
		return amount;
	}

	public void setAmount(Long amount) {
		this.amount = amount;
	}

	public Integer getGraceMinutes() {
		return graceMinutes;
	}

	public void setGraceMinutes(Integer graceMinutes) {
		this.graceMinutes = graceMinutes;
	}

	public Set<DayOfWeek> getWeekdays() {
		return weekdays;
	}

	public void setWeekdays(Set<DayOfWeek> weekdays) {
		this.weekdays.clear();
		if (weekdays != null) {
			this.weekdays.addAll(weekdays);
		}
	}

	public List<SurchargeDateRange> getDateRanges() {
		return dateRanges;
	}

	/** Thay toàn bộ danh sách khoảng ngày, giữ nguyên quan hệ 2 chiều cho cascade. */
	public void setDateRanges(List<SurchargeDateRange> dateRanges) {
		this.dateRanges.clear();
		if (dateRanges != null) {
			for (SurchargeDateRange range : dateRanges) {
				range.setSurcharge(this);
				this.dateRanges.add(range);
			}
		}
	}

	public Set<RoomType> getRoomTypes() {
		return roomTypes;
	}

	public void setRoomTypes(Set<RoomType> roomTypes) {
		this.roomTypes.clear();
		if (roomTypes != null) {
			this.roomTypes.addAll(roomTypes);
		}
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}
}
