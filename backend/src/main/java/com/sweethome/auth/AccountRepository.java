package com.sweethome.auth;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

	/**
	 * Ghi số lần đăng nhập sai và hạn khoá tạm. Cập nhật thẳng (không qua entity) để không đổi cột updated_at/by —
	 * đăng nhập không phải là sửa tài khoản.
	 *
	 * @param id          tài khoản
	 * @param count       số lần sai liên tiếp
	 * @param lockedUntil khoá tạm tới thời điểm này, null nếu không khoá
	 */
	@Modifying
	@Query("update Account a set a.failedLoginCount = :count, a.loginLockedUntil = :lockedUntil where a.id = :id")
	void updateLoginFailures(@Param("id") Long id, @Param("count") int count, @Param("lockedUntil") LocalDateTime lockedUntil);
}
