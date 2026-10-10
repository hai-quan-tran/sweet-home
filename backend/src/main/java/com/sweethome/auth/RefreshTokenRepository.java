package com.sweethome.auth;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn refresh token.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	/**
	 * Tìm refresh token còn hiệu lực (chưa thu hồi, chưa hết hạn) theo giá trị đã băm.
	 *
	 * @param tokenHash giá trị đã băm SHA-256
	 * @param now       thời điểm hiện tại để so sánh hết hạn
	 * @return refresh token nếu còn dùng được
	 */
	@Query("select t from RefreshToken t where t.tokenHash = :tokenHash and t.revoked = false and t.expiresAt > :now")
	Optional<RefreshToken> findValid(@Param("tokenHash") String tokenHash, @Param("now") Instant now);

	/**
	 * Thu hồi toàn bộ refresh token của một tài khoản, dùng khi đăng xuất, đổi mật khẩu hoặc khoá tài khoản.
	 *
	 * @param accountId id tài khoản
	 */
	@Modifying
	@Query("update RefreshToken t set t.revoked = true where t.account.id = :accountId and t.revoked = false")
	void revokeAllByAccountId(@Param("accountId") Long accountId);
}
