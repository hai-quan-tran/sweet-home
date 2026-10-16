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
 * Kiểm tra lưu/đọc/xoá file ảnh phòng trên đĩa; loại ảnh xác định theo byte đầu file, không theo tên/content-type
 * trình duyệt gửi lên.
 */
class RoomPhotoStorageServiceTest {

	private static final byte[] PNG = { (byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 1, 2 };
	private static final byte[] JPG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0 };
	private static final byte[] WEBP = { 'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 'V' };

	@TempDir
	Path tempDir;

	private RoomPhotoStorageService service() {
		return new RoomPhotoStorageService(tempDir.toString());
	}

	@Test
	void savesImageWithGeneratedNameAndRealExtension() {
		RoomPhotoStorageService service = service();
		MockMultipartFile file = new MockMultipartFile("files", "phong-dep.jpeg", "image/jpeg", JPG);

		String storedName = service.save(file);

		assertThat(storedName).endsWith(".jpg").isNotEqualTo("phong-dep.jpeg");
		assertThat(Files.exists(tempDir.resolve(storedName))).isTrue();
	}

	@Test
	void extensionFollowsContentNotFileName() {
		RoomPhotoStorageService service = service();

		assertThat(service.save(new MockMultipartFile("files", "a.jpg", "image/jpeg", PNG))).endsWith(".png");
		assertThat(service.save(new MockMultipartFile("files", "a", "image/webp", WEBP))).endsWith(".webp");
	}

	@Test
	void rejectsHtmlDisguisedAsImage() {
		MockMultipartFile file = new MockMultipartFile("files", "x.html", "image/png", "<script>alert(1)</script>".getBytes());

		assertThatThrownBy(() -> service().save(file)).isInstanceOf(BusinessException.class);
	}

	@Test
	void readReturnsContentAndContentType() {
		RoomPhotoStorageService service = service();
		String storedName = service.save(new MockMultipartFile("files", "a.png", "image/png", PNG));

		RoomPhotoStorageService.StoredFile result = service.read(storedName);

		assertThat(result.content()).isEqualTo(PNG);
		assertThat(result.contentType()).isEqualTo("image/png");
	}

	@Test
	void readOfUnknownExtensionIsOctetStream() throws Exception {
		Files.writeString(tempDir.resolve("cu.html"), "<b>x</b>");

		assertThat(service().read("cu.html").contentType()).isEqualTo("application/octet-stream");
	}

	@Test
	void deleteRemovesFile() {
		RoomPhotoStorageService service = service();
		String storedName = service.save(new MockMultipartFile("files", "a.png", "image/png", PNG));

		service.delete(storedName);

		assertThat(Files.exists(tempDir.resolve(storedName))).isFalse();
	}

	@Test
	void deleteOfMissingFileDoesNotThrow() {
		service().delete("khong-ton-tai.jpg");
	}

	@Test
	void rejectsNonImageFile() {
		MockMultipartFile file = new MockMultipartFile("files", "a.txt", "text/plain", "abc".getBytes());

		assertThatThrownBy(() -> service().save(file)).isInstanceOf(BusinessException.class);
	}

	@Test
	void rejectsEmptyFile() {
		MockMultipartFile file = new MockMultipartFile("files", "a.jpg", "image/jpeg", new byte[0]);

		assertThatThrownBy(() -> service().save(file)).isInstanceOf(BusinessException.class);
	}

	@Test
	void readOfMissingFileThrowsNotFound() {
		assertThatThrownBy(() -> service().read("khong-ton-tai.jpg")).isInstanceOf(BusinessException.class);
	}
}
