package com.sweethome.room;

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

/**
 * Một phòng cho thuê: thông tin cơ bản, giá (theo hạng hoặc giá riêng), hình thức check-in
 * mặc định và trạng thái nhận đặt.
 */
@Entity
@Table(name = "room")
public class Room extends Auditable {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "room_number", nullable = false, unique = true, length = 20)
	private String roomNumber;

	@Column(nullable = false, length = 100)
	private String name;

	private Integer floor;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "room_type_id", nullable = false)
	private RoomType roomType;

	@Column(name = "max_guests", nullable = false)
	private Integer maxGuests;

	@Column(name = "bed_config", length = 100)
	private String bedConfig;

	@Column(length = 500)
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(name = "pricing_mode", nullable = false, length = 20)
	private RoomPricingMode pricingMode = RoomPricingMode.ROOM_TYPE;

	@Column(name = "own_two_hour_price")
	private Long ownTwoHourPrice;

	@Column(name = "own_extra_hour_price")
	private Long ownExtraHourPrice;

	@Column(name = "own_overnight_price")
	private Long ownOvernightPrice;

	@Column(name = "own_daily_price")
	private Long ownDailyPrice;

	@Enumerated(EnumType.STRING)
	@Column(name = "default_check_in_mode", nullable = false, length = 20)
	private CheckInMode defaultCheckInMode = CheckInMode.SELF;

	@Column(name = "check_in_guide", length = 1000)
	private String checkInGuide;

	@Column(name = "accepting_bookings", nullable = false)
	private boolean acceptingBookings = true;

	@OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	@OrderBy("sortOrder asc")
	private List<RoomPhoto> photos = new ArrayList<>();

	public Long getId() {
		return id;
	}

	public String getRoomNumber() {
		return roomNumber;
	}

	public void setRoomNumber(String roomNumber) {
		this.roomNumber = roomNumber;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public Integer getFloor() {
		return floor;
	}

	public void setFloor(Integer floor) {
		this.floor = floor;
	}

	public RoomType getRoomType() {
		return roomType;
	}

	public void setRoomType(RoomType roomType) {
		this.roomType = roomType;
	}

	public Integer getMaxGuests() {
		return maxGuests;
	}

	public void setMaxGuests(Integer maxGuests) {
		this.maxGuests = maxGuests;
	}

	public String getBedConfig() {
		return bedConfig;
	}

	public void setBedConfig(String bedConfig) {
		this.bedConfig = bedConfig;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public RoomPricingMode getPricingMode() {
		return pricingMode;
	}

	public void setPricingMode(RoomPricingMode pricingMode) {
		this.pricingMode = pricingMode;
	}

	public Long getOwnTwoHourPrice() {
		return ownTwoHourPrice;
	}

	public void setOwnTwoHourPrice(Long ownTwoHourPrice) {
		this.ownTwoHourPrice = ownTwoHourPrice;
	}

	public Long getOwnExtraHourPrice() {
		return ownExtraHourPrice;
	}

	public void setOwnExtraHourPrice(Long ownExtraHourPrice) {
		this.ownExtraHourPrice = ownExtraHourPrice;
	}

	public Long getOwnOvernightPrice() {
		return ownOvernightPrice;
	}

	public void setOwnOvernightPrice(Long ownOvernightPrice) {
		this.ownOvernightPrice = ownOvernightPrice;
	}

	public Long getOwnDailyPrice() {
		return ownDailyPrice;
	}

	public void setOwnDailyPrice(Long ownDailyPrice) {
		this.ownDailyPrice = ownDailyPrice;
	}

	public CheckInMode getDefaultCheckInMode() {
		return defaultCheckInMode;
	}

	public void setDefaultCheckInMode(CheckInMode defaultCheckInMode) {
		this.defaultCheckInMode = defaultCheckInMode;
	}

	public String getCheckInGuide() {
		return checkInGuide;
	}

	public void setCheckInGuide(String checkInGuide) {
		this.checkInGuide = checkInGuide;
	}

	public boolean isAcceptingBookings() {
		return acceptingBookings;
	}

	public void setAcceptingBookings(boolean acceptingBookings) {
		this.acceptingBookings = acceptingBookings;
	}

	public List<RoomPhoto> getPhotos() {
		return photos;
	}
}
