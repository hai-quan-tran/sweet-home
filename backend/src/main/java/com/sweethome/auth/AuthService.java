package com.sweethome.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.common.error.BusinessException;

/**
 * Xử lý đăng nhập, cấp lại token, đăng xuất và đổi mật khẩu.
 */
@Service
public class AuthService {

	/** Sai mật khẩu liên tiếp bao nhiêu lần thì khoá tạm. */
	static final int MAX_FAILED_LOGINS = 5;
	/** Thời gian khoá tạm. */
	static final Duration LOGIN_LOCK = Duration.ofMinutes(15);

	private final AccountRepository accountRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final JwtService jwtService;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;
	private final long refreshTokenDays;
	private final long refreshTokenRememberDays;
	/** Mật khẩu băm giả dùng khi tên đăng nhập không tồn tại. */
	private final String dummyHash;

	public AuthService(AccountRepository accountRepository, RefreshTokenRepository refreshTokenRepository,
			JwtService jwtService, PasswordEncoder passwordEncoder, Clock clock,
			@Value("${app.jwt.refresh-token-days}") long refreshTokenDays,
			@Value("${app.jwt.refresh-token-remember-days}") long refreshTokenRememberDays) {
		this.accountRepository = accountRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.jwtService = jwtService;
		this.passwordEncoder = passwordEncoder;
		this.clock = clock;
		this.refreshTokenDays = refreshTokenDays;
		this.refreshTokenRememberDays = refreshTokenRememberDays;
		this.dummyHash = passwordEncoder.encode("sweet-home-dummy-password");
	}

	/**
	 * Kiểm tra tên đăng nhập/mật khẩu và cấp token mới. Sai mật khẩu {@value #MAX_FAILED_LOGINS} lần liên tiếp thì
	 * khoá tạm 15 phút; không rollback khi lỗi để giữ số lần sai.
	 *
	 * @param username       tên đăng nhập
	 * @param rawPassword    mật khẩu
	 * @param rememberDevice true nếu chọn "Ghi nhớ thiết bị" (refresh token sống lâu hơn)
	 * @return token và thông tin tài khoản
	 */
	@Transactional(noRollbackFor = BusinessException.class)
	public AuthResult login(String username, String rawPassword, boolean rememberDevice) {
		LocalDateTime now = LocalDateTime.now(clock);
		Account account = accountRepository.findByUsername(username).orElse(null);
		if (account == null) {
			// Vẫn so một mật khẩu băm để thời gian trả lời không lộ tên đăng nhập có tồn tại hay không.
			passwordEncoder.matches(rawPassword, dummyHash);
			throw invalidCredentials();
		}
		if (account.getLoginLockedUntil() != null && now.isBefore(account.getLoginLockedUntil())) {
			throw tooManyFailures(account.getLoginLockedUntil(), now);
		}
		if (!passwordEncoder.matches(rawPassword, account.getPasswordHash())) {
			int failed = account.getFailedLoginCount() + 1;
			if (failed >= MAX_FAILED_LOGINS) {
				accountRepository.updateLoginFailures(account.getId(), 0, now.plus(LOGIN_LOCK));
				throw tooManyFailures(now.plus(LOGIN_LOCK), now);
			}
			accountRepository.updateLoginFailures(account.getId(), failed, null);
			throw invalidCredentials();
		}
		// Chỉ báo "đã bị khoá" khi mật khẩu đúng, tránh người ngoài dò được tài khoản nào tồn tại.
		if (account.getStatus() == AccountStatus.LOCKED) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá");
		}
		if (account.getFailedLoginCount() > 0 || account.getLoginLockedUntil() != null) {
			accountRepository.updateLoginFailures(account.getId(), 0, null);
		}
		return issueTokens(account, rememberDevice);
	}

	private static BusinessException invalidCredentials() {
		return new BusinessException(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không đúng");
	}

	/** Lỗi khoá tạm, báo số phút còn lại (làm tròn lên). */
	private static BusinessException tooManyFailures(LocalDateTime lockedUntil, LocalDateTime now) {
		long minutes = Math.max(1, Math.ceilDiv(Duration.between(now, lockedUntil).toSeconds(), 60));
		return new BusinessException(HttpStatus.TOO_MANY_REQUESTS,
				"Đăng nhập sai quá nhiều lần, thử lại sau " + minutes + " phút");
	}

	/**
	 * Cấp lại access token từ refresh token còn hiệu lực, xoay refresh token (thu hồi token cũ, cấp token mới).
	 *
	 * @param rawRefreshToken refresh token hiện tại từ cookie
	 * @return token mới và thông tin tài khoản
	 */
	@Transactional
	public AuthResult refresh(String rawRefreshToken) {
		String hash = jwtService.hash(rawRefreshToken);
		RefreshToken stored = refreshTokenRepository.findValid(hash, Instant.now())
				.orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn"));
		Account account = stored.getAccount();
		if (account.getStatus() == AccountStatus.LOCKED) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá");
		}
		stored.setRevoked(true);
		return issueTokens(account, stored.isRemembered());
	}

	/**
	 * Thu hồi refresh token khi đăng xuất.
	 *
	 * @param rawRefreshToken refresh token từ cookie, có thể null nếu không có
	 */
	@Transactional
	public void logout(String rawRefreshToken) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			return;
		}
		String hash = jwtService.hash(rawRefreshToken);
		refreshTokenRepository.findValid(hash, Instant.now()).ifPresent(t -> t.setRevoked(true));
	}

	/**
	 * Đổi mật khẩu: kiểm tra mật khẩu cũ, áp quy tắc mật khẩu mới, thu hồi mọi refresh token cũ
	 * (buộc đăng nhập lại ở các thiết bị khác) rồi cấp token mới cho thiết bị hiện tại.
	 *
	 * @param accountId   id tài khoản đang đăng nhập
	 * @param oldPassword mật khẩu hiện tại
	 * @param newPassword mật khẩu mới
	 * @return token mới và thông tin tài khoản
	 */
	@Transactional
	public AuthResult changePassword(Long accountId, String oldPassword, String newPassword) {
		Account account = accountRepository.findById(accountId)
				.orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Tài khoản không tồn tại"));
		if (!passwordEncoder.matches(oldPassword, account.getPasswordHash())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
		}
		PasswordPolicy.validate(newPassword);
		account.setPasswordHash(passwordEncoder.encode(newPassword));
		account.setMustChangePassword(false);
		refreshTokenRepository.revokeAllByAccountId(account.getId());
		return issueTokens(account, false);
	}

	/**
	 * Tạo access token mới và một refresh token mới đã lưu DB.
	 */
	private AuthResult issueTokens(Account account, boolean rememberDevice) {
		String accessToken = jwtService.generateAccessToken(account);
		String rawRefreshToken = jwtService.generateRefreshTokenValue();
		long days = rememberDevice ? refreshTokenRememberDays : refreshTokenDays;

		RefreshToken refreshToken = new RefreshToken();
		refreshToken.setAccount(account);
		refreshToken.setTokenHash(jwtService.hash(rawRefreshToken));
		refreshToken.setExpiresAt(Instant.now().plusSeconds(days * 86400));
		refreshToken.setRemembered(rememberDevice);
		refreshTokenRepository.save(refreshToken);

		return new AuthResult(account, accessToken, rawRefreshToken, days * 86400);
	}

	/**
	 * Kết quả đăng nhập/cấp lại token: token để đặt cookie và tài khoản tương ứng.
	 *
	 * @param account             tài khoản
	 * @param accessToken         access token JWT
	 * @param refreshToken        refresh token gốc (chưa băm)
	 * @param refreshTokenTtlSeconds thời gian sống refresh token (giây), dùng đặt Max-Age cookie
	 */
	public record AuthResult(Account account, String accessToken, String refreshToken, long refreshTokenTtlSeconds) {
	}
}
