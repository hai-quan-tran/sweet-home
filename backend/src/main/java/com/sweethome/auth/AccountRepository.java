package com.sweethome.auth;

import java.util.List;
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

	/**
	 * Kiểm tra tên đăng nhập đã có người dùng chưa.
	 *
	 * @param username tên đăng nhập
	 * @return true nếu đã tồn tại
	 */
	boolean existsByUsername(String username);

	/**
	 * Danh sách tài khoản cho màn Nhân viên: Nhân viên trước, Quản lý sau, rồi theo họ tên.
	 *
	 * @return danh sách tài khoản
	 */
	List<Account> findAllByOrderByRoleDescFullNameAsc();
}
