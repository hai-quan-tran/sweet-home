package com.sweethome.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Kiểm tra xem/sửa thông tin homestay (1 dòng duy nhất).
 */
@ExtendWith(MockitoExtension.class)
class HomestayServiceTest {

	@Mock
	private HomestayInfoRepository repository;

	private HomestayService service;
	private HomestayInfo info;

	@BeforeEach
	void setUp() {
		service = new HomestayService(repository);
		info = new HomestayInfo();
		info.setName("Sweet Home");
		info.setHotline("0909123456");
		info.setAddress("25 Trần Hưng Đạo");
	}

	@Test
	void getReturnsCurrentInfo() {
		when(repository.findById(HomestayInfo.SINGLETON_ID)).thenReturn(Optional.of(info));

		assertThat(service.get().name()).isEqualTo("Sweet Home");
	}

	@Test
	void updateSavesAllFields() {
		when(repository.findById(HomestayInfo.SINGLETON_ID)).thenReturn(Optional.of(info));
		when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
		var request = new HomestayInfoUpdateRequest("Sweet Home 2", "0909999999", "Địa chỉ mới",
				"https://maps.app.goo.gl/x", "Wifi5G", "pass123");

		var dto = service.update(request);

		assertThat(dto.name()).isEqualTo("Sweet Home 2");
		assertThat(dto.hotline()).isEqualTo("0909999999");
		assertThat(dto.wifiName()).isEqualTo("Wifi5G");
	}
}
