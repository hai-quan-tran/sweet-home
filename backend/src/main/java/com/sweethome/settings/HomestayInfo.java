package com.sweethome.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.sweethome.common.audit.Auditable;

/**
 * Thông tin homestay dùng để chèn vào mẫu tin nhắn gửi khách. Chỉ có đúng 1 dòng (id cố định
 * bằng {@link #SINGLETON_ID}), giống {@code PricingSettings} ở GĐ2.
 */
@Entity
@Table(name = "homestay_info")
public class HomestayInfo extends Auditable {

	public static final long SINGLETON_ID = 1L;

	@Id
	private Long id = SINGLETON_ID;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, length = 30)
	private String hotline;

	@Column(nullable = false, length = 255)
	private String address;

	@Column(name = "map_link", length = 255)
	private String mapLink;

	@Column(name = "wifi_name", length = 100)
	private String wifiName;

	@Column(name = "wifi_password", length = 100)
	private String wifiPassword;

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getHotline() {
		return hotline;
	}

	public void setHotline(String hotline) {
		this.hotline = hotline;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getMapLink() {
		return mapLink;
	}

	public void setMapLink(String mapLink) {
		this.mapLink = mapLink;
	}

	public String getWifiName() {
		return wifiName;
	}

	public void setWifiName(String wifiName) {
		this.wifiName = wifiName;
	}

	public String getWifiPassword() {
		return wifiPassword;
	}

	public void setWifiPassword(String wifiPassword) {
		this.wifiPassword = wifiPassword;
	}
}
