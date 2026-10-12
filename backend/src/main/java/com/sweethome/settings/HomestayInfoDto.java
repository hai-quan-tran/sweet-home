package com.sweethome.settings;

/**
 * Thông tin homestay.
 *
 * @param name         tên homestay
 * @param hotline      số điện thoại hỗ trợ
 * @param address      địa chỉ
 * @param mapLink      link bản đồ, có thể bỏ trống
 * @param wifiName     tên wifi, có thể bỏ trống
 * @param wifiPassword mật khẩu wifi, có thể bỏ trống
 */
public record HomestayInfoDto(String name, String hotline, String address, String mapLink, String wifiName,
		String wifiPassword) {

	public static HomestayInfoDto from(HomestayInfo info) {
		return new HomestayInfoDto(info.getName(), info.getHotline(), info.getAddress(), info.getMapLink(),
				info.getWifiName(), info.getWifiPassword());
	}
}
