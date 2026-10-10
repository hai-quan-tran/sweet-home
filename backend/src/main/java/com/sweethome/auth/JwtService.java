package com.sweethome.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Sinh và kiểm tra access token (JWT), sinh refresh token ngẫu nhiên và băm để lưu DB.
 */
@Service
public class JwtService {

	private static final String CLAIM_ACCOUNT_ID = "accountId";
	private static final String CLAIM_ROLE = "role";

	private final SecretKey signingKey;
	private final long accessTokenMinutes;
	private final SecureRandom random = new SecureRandom();

	public JwtService(@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.access-token-minutes}") long accessTokenMinutes) {
		this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
		this.accessTokenMinutes = accessTokenMinutes;
	}

	/**
	 * Tạo access token JWT chứa id và vai trò tài khoản, hết hạn sau {@code access-token-minutes}.
	 *
	 * @param account tài khoản đã xác thực
	 * @return chuỗi JWT đã ký
	 */
	public String generateAccessToken(Account account) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(account.getUsername())
				.claim(CLAIM_ACCOUNT_ID, account.getId())
				.claim(CLAIM_ROLE, account.getRole().name())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plusSeconds(accessTokenMinutes * 60)))
				.signWith(signingKey)
				.compact();
	}

	/**
	 * Số giây access token còn sống, dùng để đặt Max-Age cho cookie.
	 *
	 * @return thời gian sống access token (giây)
	 */
	public long accessTokenTtlSeconds() {
		return accessTokenMinutes * 60;
	}

	/**
	 * Kiểm tra và đọc nội dung access token.
	 *
	 * @param token chuỗi JWT từ cookie
	 * @return thông tin xác thực nếu token hợp lệ, rỗng nếu sai hoặc hết hạn
	 */
	public java.util.Optional<AuthenticatedPrincipal> parseAccessToken(String token) {
		try {
			Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
			Long accountId = claims.get(CLAIM_ACCOUNT_ID, Long.class);
			AccountRole role = AccountRole.valueOf(claims.get(CLAIM_ROLE, String.class));
			return java.util.Optional.of(new AuthenticatedPrincipal(accountId, claims.getSubject(), role));
		} catch (JwtException | IllegalArgumentException e) {
			return java.util.Optional.empty();
		}
	}

	/**
	 * Sinh giá trị refresh token ngẫu nhiên (256 bit, base64url) để gửi về client qua cookie.
	 *
	 * @return refresh token dạng chuỗi
	 */
	public String generateRefreshTokenValue() {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	/**
	 * Băm refresh token bằng SHA-256 trước khi lưu DB (không lưu token gốc).
	 *
	 * @param rawToken refresh token gốc
	 * @return chuỗi hex đã băm
	 */
	public String hash(String rawToken) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
			StringBuilder sb = new StringBuilder(hash.length * 2);
			for (byte b : hash) {
				sb.append(String.format("%02x", b));
			}
			return sb.toString();
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("Thiếu thuật toán SHA-256", e);
		}
	}

	/**
	 * Thông tin tối thiểu lấy được từ access token để dựng Authentication.
	 *
	 * @param accountId id tài khoản
	 * @param username  tên đăng nhập
	 * @param role      vai trò
	 */
	public record AuthenticatedPrincipal(Long accountId, String username, AccountRole role) {
	}
}
