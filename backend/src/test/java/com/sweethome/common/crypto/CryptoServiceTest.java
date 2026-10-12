package com.sweethome.common.crypto;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Base64;

import org.junit.jupiter.api.Test;

/**
 * Kiểm tra mã hoá/giải mã AES-256/GCM dùng cho CCCD và mã cửa.
 */
class CryptoServiceTest {

	private final CryptoService service = new CryptoService(Base64.getEncoder().encodeToString(new byte[32]));

	@Test
	void decryptReturnsOriginalPlainText() {
		String encrypted = service.encrypt("079201001234");

		assertThat(service.decrypt(encrypted)).isEqualTo("079201001234");
	}

	@Test
	void encryptIsNotPlainTextAndRandomizedEachTime() {
		String a = service.encrypt("482915");
		String b = service.encrypt("482915");

		assertThat(a).isNotEqualTo("482915");
		assertThat(a).isNotEqualTo(b);
		assertThat(service.decrypt(a)).isEqualTo("482915");
		assertThat(service.decrypt(b)).isEqualTo("482915");
	}

	@Test
	void nullInputReturnsNull() {
		assertThat(service.encrypt(null)).isNull();
		assertThat(service.decrypt(null)).isNull();
	}
}
