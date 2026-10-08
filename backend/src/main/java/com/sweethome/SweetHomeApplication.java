package com.sweethome;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Điểm khởi động ứng dụng Sweet Home.
 */
@SpringBootApplication
public class SweetHomeApplication {

	/** Múi giờ nghiệp vụ: mọi giờ nhận/trả phòng đều theo giờ Việt Nam. */
	public static final String TIME_ZONE = "Asia/Ho_Chi_Minh";

	/**
	 * Đặt múi giờ mặc định của JVM rồi khởi động Spring.
	 *
	 * @param args tham số dòng lệnh
	 */
	public static void main(String[] args) {
		TimeZone.setDefault(TimeZone.getTimeZone(TIME_ZONE));
		SpringApplication.run(SweetHomeApplication.class, args);
	}

}
