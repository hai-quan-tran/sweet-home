package com.sweethome.common.time;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import com.sweethome.SweetHomeApplication;

/**
 * Đồng hồ nghiệp vụ (giờ Việt Nam) dùng chung để test thay được thời điểm "bây giờ", và bật tác vụ
 * định kỳ (tự chuyển trạng thái đơn theo giờ).
 */
@Configuration
@EnableScheduling
public class TimeConfig {

	/** Đồng hồ hệ thống theo múi giờ nghiệp vụ. */
	@Bean
	public Clock clock() {
		return Clock.system(ZoneId.of(SweetHomeApplication.TIME_ZONE));
	}
}
