package com.sweethome.common.crypto;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Mã hoá/giải mã các trường nhạy cảm lưu trong DB (CCCD, mã cửa) bằng AES-256/GCM. Mỗi lần mã hoá
 * sinh IV ngẫu nhiên riêng, ghép (IV + bản mã) rồi encode base64 thành một chuỗi lưu DB.
 */
@Service
public class CryptoService {

	private static final String ALGORITHM = "AES/GCM/NoPadding";
	private static final int IV_LENGTH_BYTES = 12;
	private static final int TAG_LENGTH_BITS = 128;

	private final SecretKeySpec key;
	private final SecureRandom random = new SecureRandom();

	public CryptoService(@Value("${app.crypto.secret}") String secret) {
		this.key = new SecretKeySpec(Base64.getDecoder().decode(secret), "AES");
	}

	/**
	 * Mã hoá một chuỗi plaintext.
	 *
	 * @param plainText nội dung gốc, null trả về null
	 * @return chuỗi base64 (IV + bản mã), hoặc null nếu đầu vào null
	 */
	public String encrypt(String plainText) {
		if (plainText == null) {
			return null;
		}
		try {
			byte[] iv = new byte[IV_LENGTH_BYTES];
			random.nextBytes(iv);
			Cipher cipher = Cipher.getInstance(ALGORITHM);
			cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
			byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
			byte[] combined = new byte[iv.length + cipherText.length];
			System.arraycopy(iv, 0, combined, 0, iv.length);
			System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);
			return Base64.getEncoder().encodeToString(combined);
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("Không mã hoá được dữ liệu", e);
		}
	}

	/**
	 * Giải mã một chuỗi đã mã hoá bởi {@link #encrypt(String)}.
	 *
	 * @param encoded chuỗi base64 (IV + bản mã), null trả về null
	 * @return nội dung gốc, hoặc null nếu đầu vào null
	 */
	public String decrypt(String encoded) {
		if (encoded == null) {
			return null;
		}
		try {
			byte[] combined = Base64.getDecoder().decode(encoded);
			byte[] iv = new byte[IV_LENGTH_BYTES];
			System.arraycopy(combined, 0, iv, 0, IV_LENGTH_BYTES);
			Cipher cipher = Cipher.getInstance(ALGORITHM);
			cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
			byte[] plainText = cipher.doFinal(combined, IV_LENGTH_BYTES, combined.length - IV_LENGTH_BYTES);
			return new String(plainText, StandardCharsets.UTF_8);
		} catch (GeneralSecurityException e) {
			throw new IllegalStateException("Không giải mã được dữ liệu", e);
		}
	}
}
