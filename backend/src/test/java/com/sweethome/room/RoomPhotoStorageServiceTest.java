package com.sweethome.room;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.sweethome.common.error.BusinessException;

/**
 * Kiểm tra lưu/đọc/xoá file ảnh phòng trên đĩa.
 */
class RoomPhotoStorageServiceTest {

	@TempDir
	Path tempDir;

	private RoomPhotoStorageService service() {
		return new RoomPhotoStorageService(tempDir.toString());
	}

	@Test
	void savesImageWithGeneratedNameKeepingExtension() {
		RoomPhotoStorageService service = service();
		MockMultipartFile file = new MockMultipartFile("files", "phong-dep.jpg", "image/jpeg", "data".getBytes());

		String storedName = service.save(file);

		assertThat(storedName).endsWith(".jpg");
		assertThat(storedName).isNotEqualTo("phong-dep.jpg");
		assertThat(Files.exists(tempDir.resolve(storedName))).isTrue();
	}

	@Test
	void readReturnsContentAndContentType() {
		RoomPhotoStorageService service = service();
		MockMultipartFile file = new MockMultipartFile("files", "a.png", "image/png", "abc".getBytes());
		String storedName = service.save(file);

		RoomPhotoStorageService.StoredFile result = service.read(storedName);

		assertThat(result.content()).isEqualTo("abc".getBytes());
		assertThat(result.contentType()).isEqualTo("image/png");
	}

	@Test
	void deleteRemovesFile() {
		RoomPhotoStorageService service = service();
		MockMultipartFile file = new MockMultipartFile("files", "a.png", "image/png", "abc".getBytes());
		String storedName = service.save(file);

		service.delete(storedName);

		assertThat(Files.exists(tempDir.resolve(storedName))).isFalse();
	}

	@Test
	void deleteOfMissingFileDoesNotThrow() {
		service().delete("khong-ton-tai.jpg");
	}

	@Test
	void rejectsNonImageFile() {
		RoomPhotoStorageService service = service();
		MockMultipartFile file = new MockMultipartFile("files", "a.txt", "text/plain", "abc".getBytes());

		assertThatThrownBy(() -> service.save(file)).isInstanceOf(BusinessException.class);
	}

	@Test
	void rejectsEmptyFile() {
		RoomPhotoStorageService service = service();
		MockMultipartFile file = new MockMultipartFile("files", "a.jpg", "image/jpeg", new byte[0]);

		assertThatThrownBy(() -> service.save(file)).isInstanceOf(BusinessException.class);
	}

	@Test
	void readOfMissingFileThrowsNotFound() {
		assertThatThrownBy(() -> service().read("khong-ton-tai.jpg")).isInstanceOf(BusinessException.class);
	}
}
