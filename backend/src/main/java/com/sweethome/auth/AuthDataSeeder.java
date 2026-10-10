package com.sweethome.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Tạo tài khoản Quản lý mặc định khi khởi động lần đầu (chưa có tài khoản nào trong DB).
 */
@Component
public class AuthDataSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AuthDataSeeder.class);
	private static final String DEFAULT_USERNAME = "admin";
	private static final String DEFAULT_PASSWORD = "Admin@123";

	private final AccountRepository accountRepository;
	private final PasswordEncoder passwordEncoder;

	public AuthDataSeeder(AccountRepository accountRepository, PasswordEncoder passwordEncoder) {
		this.accountRepository = accountRepository;
		this.passwordEncoder = passwordEncoder;
	}

	/** Tạo tài khoản admin mặc định nếu DB chưa có tài khoản nào, bắt đổi mật khẩu ở lần đăng nhập đầu. */
	@Override
	public void run(ApplicationArguments args) {
		if (accountRepository.count() > 0) {
			return;
		}
		Account admin = new Account();
		admin.setUsername(DEFAULT_USERNAME);
		admin.setPasswordHash(passwordEncoder.encode(DEFAULT_PASSWORD));
		admin.setFullName("Quản trị hệ thống");
		admin.setRole(AccountRole.MANAGER);
		admin.setMustChangePassword(true);
		accountRepository.save(admin);
		log.warn("Đã tạo tài khoản Quản lý mặc định: {} / {} — đổi mật khẩu ngay sau khi đăng nhập lần đầu",
				DEFAULT_USERNAME, DEFAULT_PASSWORD);
	}
}
