package com.sweethome.auth;

/**
 * Thông tin tài khoản trả về cho frontend sau khi đăng nhập hoặc gọi /auth/me. Không chứa token.
 *
 * @param id                 id tài khoản
 * @param username           tên đăng nhập
 * @param fullName           họ tên
 * @param role               vai trò
 * @param mustChangePassword true nếu phải đổi mật khẩu ở lần đăng nhập này
 */
public record AccountSummary(Long id, String username, String fullName, AccountRole role, boolean mustChangePassword) {

	/**
	 * Dựng từ entity tài khoản.
	 *
	 * @param account tài khoản
	 * @return thông tin tóm tắt
	 */
	public static AccountSummary from(Account account) {
		return new AccountSummary(account.getId(), account.getUsername(), account.getFullName(), account.getRole(),
				account.isMustChangePassword());
	}
}
