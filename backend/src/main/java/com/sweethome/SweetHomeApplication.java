package com.sweethome;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/**
 * Điểm khởi động ứng dụng Sweet Home.
 */
// Bỏ user nhớ tạm Spring tự sinh (in mật khẩu ra log): đăng nhập dùng JWT + bảng account, không cần UserDetailsService.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
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
