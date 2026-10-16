package com.sweethome.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Tạo tài khoản Quản lý mặc định khi khởi động lần đầu (chưa có tài khoản nào trong DB). Mật khẩu ban đầu lấy từ
 * cấu hình {@code app.admin.initial-password} (stage/prod: biến môi trường {@code ADMIN_INITIAL_PASSWORD}) để không có
 * mật khẩu mặc định ai cũng biết trên server thật.
 */
@Component
public class AuthDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AuthDataSeeder.class);
	private static final String DEFAULT_USERNAME = "admin";

	private final AccountRepository accountRepository;
	private final PasswordEncoder passwordEncoder;
	private final String initialPassword;

	public AuthDataSeeder(AccountRepository accountRepository, PasswordEncoder passwordEncoder,
			@Value("${app.admin.initial-password:}") String initialPassword) {
		this.accountRepository = accountRepository;
		this.passwordEncoder = passwordEncoder;
		this.initialPassword = initialPassword;
	}

	/**
	 * Tạo tài khoản admin nếu DB chưa có tài khoản nào, bắt đổi mật khẩu ở lần đăng nhập đầu. Chưa cấu hình mật khẩu
	 * ban đầu (hoặc không đúng quy tắc mật khẩu) thì dừng khởi động.
	 */
	@Override
	public void run(ApplicationArguments args) {
		if (accountRepository.count() > 0) {
			return;
		}
		if (initialPassword == null || initialPassword.isBlank()) {
			throw new IllegalStateException("Chưa có tài khoản nào: đặt biến môi trường ADMIN_INITIAL_PASSWORD để tạo tài khoản admin");
		}
		PasswordPolicy.validate(initialPassword);
		Account admin = new Account();
		admin.setUsername(DEFAULT_USERNAME);
		admin.setPasswordHash(passwordEncoder.encode(initialPassword));
		admin.setFullName("Quản trị hệ thống");
		admin.setRole(AccountRole.MANAGER);
		admin.setMustChangePassword(true);
		accountRepository.save(admin);
		log.warn("Đã tạo tài khoản Quản lý mặc định '{}' với mật khẩu ban đầu theo cấu hình — đổi mật khẩu khi đăng nhập lần đầu",
				DEFAULT_USERNAME);
	}
}
