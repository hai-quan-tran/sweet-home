package com.sweethome.staff;

import java.time.LocalDate;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRole;
import com.sweethome.auth.AccountStatus;

/**
 * Tài khoản trả về cho màn Nhân viên. Không có mật khẩu; CCCD chỉ trả dạng che 4 số cuối.
 *
 * @param id             id tài khoản
 * @param username       tên đăng nhập
 * @param fullName       họ tên
 * @param phone          số điện thoại
 * @param idNumberMasked CCCD đã che, null nếu chưa nhập
 * @param startDate      ngày bắt đầu làm
 * @param role           vai trò
 * @param status         hoạt động / đã khoá
 */
public record AccountDto(Long id, String username, String fullName, String phone, String idNumberMasked,
		LocalDate startDate, AccountRole role, AccountStatus status) {

	/**
	 * Dựng từ entity tài khoản.
	 *
	 * @param account tài khoản
	 * @return DTO
	 */
	public static AccountDto from(Account account) {
		String masked = account.getIdNumberLast4() == null ? null : "•••••••• " + account.getIdNumberLast4();
		return new AccountDto(account.getId(), account.getUsername(), account.getFullName(), account.getPhone(), masked,
				account.getStartDate(), account.getRole(), account.getStatus());
	}
}
