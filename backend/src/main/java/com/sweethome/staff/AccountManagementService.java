package com.sweethome.staff;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.auth.AccountRole;
import com.sweethome.auth.AccountStatus;
import com.sweethome.auth.PasswordPolicy;
import com.sweethome.auth.RefreshTokenRepository;
import com.sweethome.common.crypto.CryptoService;
import com.sweethome.common.error.BusinessException;

/**
 * Quản lý tài khoản nhân viên (màn Nhân viên): xem, thêm, sửa, khoá/mở, đặt lại mật khẩu tạm.
 */
@Service
public class AccountManagementService {

	private final AccountRepository accountRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordEncoder passwordEncoder;
	private final CryptoService cryptoService;

	public AccountManagementService(AccountRepository accountRepository, RefreshTokenRepository refreshTokenRepository,
			PasswordEncoder passwordEncoder, CryptoService cryptoService) {
		this.accountRepository = accountRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.passwordEncoder = passwordEncoder;
		this.cryptoService = cryptoService;
	}

	/**
	 * Danh sách tài khoản: Nhân viên trước, Quản lý sau.
	 *
	 * @return danh sách tài khoản
	 */
	@Transactional(readOnly = true)
	public List<AccountDto> list() {
		return accountRepository.findAllByOrderByRoleDescFullNameAsc().stream().map(AccountDto::from).toList();
	}

	/**
	 * Chi tiết một tài khoản, dùng cho màn Sửa nhân viên.
	 *
	 * @param id id tài khoản
	 * @return tài khoản
	 */
	@Transactional(readOnly = true)
	public AccountDto get(Long id) {
		return AccountDto.from(findAccount(id));
	}

	/**
	 * Tạo tài khoản mới với mật khẩu tạm.
	 *
	 * @param request dữ liệu tài khoản
	 * @return tài khoản vừa tạo
	 */
	@Transactional
	public AccountDto create(AccountUpsertRequest request) {
		if (accountRepository.existsByUsername(request.username())) {
			throw new BusinessException(HttpStatus.CONFLICT, "Tên đăng nhập đã được dùng");
		}
		Account account = new Account();
		account.setUsername(request.username());
		applyProfile(account, request);
		setPassword(account, request);
		return AccountDto.from(accountRepository.save(account));
	}

	/**
	 * Sửa tài khoản. Không đổi tên đăng nhập (nhật ký và audit ghi theo tên đăng nhập). Đặt mật khẩu
	 * mới hoặc khoá tài khoản thì thu hồi mọi phiên đăng nhập; khoá/đổi vai trò có hiệu lực ngay vì
	 * bộ lọc JWT đọc lại tài khoản mỗi request.
	 *
	 * @param id               id tài khoản
	 * @param request          dữ liệu tài khoản
	 * @param currentAccountId id Quản lý đang thao tác
	 * @return tài khoản sau khi sửa
	 */
	@Transactional
	public AccountDto update(Long id, AccountUpsertRequest request, Long currentAccountId) {
		Account account = findAccount(id);
		if (id.equals(currentAccountId) && (request.role() != AccountRole.MANAGER || !request.active())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Không thể tự khoá hoặc tự đổi vai trò của chính mình");
		}
		applyProfile(account, request);
		boolean passwordReset = !isBlank(request.password());
		if (passwordReset) {
			setPassword(account, request);
		}
		if (passwordReset || !request.active()) {
			refreshTokenRepository.revokeAllByAccountId(id);
		}
		return AccountDto.from(accountRepository.save(account));
	}

	/** Ghi thông tin cá nhân, vai trò, trạng thái; CCCD bỏ trống thì giữ giá trị cũ. */
	private void applyProfile(Account account, AccountUpsertRequest request) {
		account.setFullName(request.fullName().trim());
		account.setPhone(request.phone().trim());
		account.setStartDate(request.startDate());
		account.setRole(request.role());
		account.setStatus(request.active() ? AccountStatus.ACTIVE : AccountStatus.LOCKED);
		if (!isBlank(request.idNumber())) {
			String digits = request.idNumber().replaceAll("\\s+", "");
			account.setIdNumberEncrypted(cryptoService.encrypt(digits));
			account.setIdNumberLast4(digits.length() <= 4 ? digits : digits.substring(digits.length() - 4));
		}
	}

	/** Đặt mật khẩu tạm theo quy tắc mật khẩu chung. */
	private void setPassword(Account account, AccountUpsertRequest request) {
		PasswordPolicy.validate(request.password());
		account.setPasswordHash(passwordEncoder.encode(request.password()));
		account.setMustChangePassword(request.mustChangePassword());
	}

	private Account findAccount(Long id) {
		return accountRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}
}
