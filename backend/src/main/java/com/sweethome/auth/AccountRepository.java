package com.sweethome.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Truy vấn tài khoản đăng nhập.
 */
public interface AccountRepository extends JpaRepository<Account, Long> {

	/**
	 * Tìm tài khoản theo tên đăng nhập.
	 *
	 * @param username tên đăng nhập
	 * @return tài khoản nếu có
	 */
	Optional<Account> findByUsername(String username);
}
