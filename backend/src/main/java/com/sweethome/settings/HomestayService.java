package com.sweethome.settings;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quản lý thông tin homestay (1 dòng duy nhất, chèn sẵn lúc tạo bảng).
 */
@Service
public class HomestayService {

	private final HomestayInfoRepository repository;

	public HomestayService(HomestayInfoRepository repository) {
		this.repository = repository;
	}

	/**
	 * Lấy thông tin homestay hiện tại.
	 *
	 * @return thông tin homestay
	 */
	@Transactional(readOnly = true)
	public HomestayInfoDto get() {
		return HomestayInfoDto.from(find());
	}

	/**
	 * Sửa thông tin homestay.
	 *
	 * @param request dữ liệu mới
	 * @return thông tin sau khi sửa
	 */
	@Transactional
	public HomestayInfoDto update(HomestayInfoUpdateRequest request) {
		HomestayInfo info = find();
		info.setName(request.name());
		info.setHotline(request.hotline());
		info.setAddress(request.address());
		info.setMapLink(request.mapLink());
		info.setWifiName(request.wifiName());
		info.setWifiPassword(request.wifiPassword());
		return HomestayInfoDto.from(repository.save(info));
	}

	private HomestayInfo find() {
		return repository.findById(HomestayInfo.SINGLETON_ID)
				.orElseThrow(() -> new IllegalStateException("Thiếu dữ liệu thông tin homestay"));
	}
}
