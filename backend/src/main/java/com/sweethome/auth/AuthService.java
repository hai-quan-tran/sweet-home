package com.sweethome.auth;

import java.time.Instant;

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

	private final AccountRepository accountRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final JwtService jwtService;
	private final PasswordEncoder passwordEncoder;
	private final long refreshTokenDays;
	private final long refreshTokenRememberDays;

	public AuthService(AccountRepository accountRepository, RefreshTokenRepository refreshTokenRepository,
			JwtService jwtService, PasswordEncoder passwordEncoder,
			@Value("${app.jwt.refresh-token-days}") long refreshTokenDays,
			@Value("${app.jwt.refresh-token-remember-days}") long refreshTokenRememberDays) {
		this.accountRepository = accountRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.jwtService = jwtService;
		this.passwordEncoder = passwordEncoder;
		this.refreshTokenDays = refreshTokenDays;
		this.refreshTokenRememberDays = refreshTokenRememberDays;
	}

	/**
	 * Kiểm tra tên đăng nhập/mật khẩu và cấp token mới.
	 *
	 * @param username       tên đăng nhập
	 * @param rawPassword    mật khẩu
	 * @param rememberDevice true nếu chọn "Ghi nhớ thiết bị" (refresh token sống lâu hơn)
	 * @return token và thông tin tài khoản
	 */
	@Transactional
	public AuthResult login(String username, String rawPassword, boolean rememberDevice) {
		Account account = accountRepository.findByUsername(username)
				.orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không đúng"));
		if (account.getStatus() == AccountStatus.LOCKED) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá");
		}
		if (!passwordEncoder.matches(rawPassword, account.getPasswordHash())) {
			throw new BusinessException(HttpStatus.UNAUTHORIZED, "Tên đăng nhập hoặc mật khẩu không đúng");
		}
		return issueTokens(account, rememberDevice);
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
