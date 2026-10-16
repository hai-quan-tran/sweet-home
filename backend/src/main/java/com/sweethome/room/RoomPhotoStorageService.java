package com.sweethome.room;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.sweethome.common.error.BusinessException;

/**
 * Đọc/ghi file ảnh phòng trên đĩa server. DB chỉ lưu tên file đã sinh (không lưu đường dẫn tuyệt đối).
 */
@Service
public class RoomPhotoStorageService {

	/** Kiểu MIME theo đuôi file đã lưu; đuôi khác (file cũ) trả octet-stream để trình duyệt không hiển thị như trang. */
	private static final Map<String, String> CONTENT_TYPES = Map.of("jpg", "image/jpeg", "png", "image/png", "webp", "image/webp");

	private final Path rootDir;

	public RoomPhotoStorageService(@Value("${app.storage.room-photos-dir}") String roomPhotosDir) {
		this.rootDir = Path.of(roomPhotosDir).toAbsolutePath().normalize();
		try {
			Files.createDirectories(rootDir);
		} catch (IOException e) {
			throw new UncheckedIOException("Không tạo được thư mục lưu ảnh phòng: " + rootDir, e);
		}
	}

	/**
	 * Lưu một file ảnh với tên ngẫu nhiên. Loại ảnh xác định theo nội dung thật (byte đầu file), không tin tên file /
	 * content-type do trình duyệt gửi — tránh lưu file HTML/script giả làm ảnh rồi trả về cùng origin với app.
	 *
	 * @param file file ảnh gửi lên
	 * @return tên file đã lưu trên đĩa (đuôi theo loại thật)
	 */
	public String save(MultipartFile file) {
		String extension;
		try (InputStream in = file.getInputStream()) {
			extension = file.isEmpty() ? null : imageExtension(in.readNBytes(12));
		} catch (IOException e) {
			throw new UncheckedIOException("Không đọc được ảnh", e);
		}
		if (extension == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chỉ nhận file ảnh JPG, PNG hoặc WebP");
		}
		String storedName = UUID.randomUUID() + extension;
		try {
			file.transferTo(rootDir.resolve(storedName));
		} catch (IOException e) {
			throw new UncheckedIOException("Không lưu được ảnh", e);
		}
		return storedName;
	}

	/** Đuôi file theo chữ ký đầu file: JPG (FF D8 FF), PNG (89 'PNG'), WebP ('RIFF' .... 'WEBP'); null nếu không phải. */
	static String imageExtension(byte[] head) {
		String ascii = new String(head, StandardCharsets.ISO_8859_1);
		if (ascii.startsWith("ÿØÿ")) {
			return ".jpg";
		}
		if (ascii.startsWith("\u0089PNG\r\n\u001A\n")) {
			return ".png";
		}
		return ascii.length() >= 12 && ascii.startsWith("RIFF") && ascii.startsWith("WEBP", 8) ? ".webp" : null;
	}

	/**
	 * Đọc toàn bộ nội dung và kiểu MIME của một file đã lưu.
	 *
	 * @param storedName tên file trên đĩa
	 * @return nội dung và content-type
	 */
	public StoredFile read(String storedName) {
		Path path = rootDir.resolve(storedName);
		try {
			byte[] content = Files.readAllBytes(path);
			return new StoredFile(content, CONTENT_TYPES.getOrDefault(storedName.substring(storedName.lastIndexOf('.') + 1), "application/octet-stream"));
		} catch (IOException e) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh");
		}
	}

	/**
	 * Xoá một file đã lưu, bỏ qua nếu không tồn tại.
	 *
	 * @param storedName tên file trên đĩa
	 */
	public void delete(String storedName) {
		try {
			Files.deleteIfExists(rootDir.resolve(storedName));
		} catch (IOException e) {
			throw new UncheckedIOException("Không xoá được ảnh", e);
		}
	}

	/**
	 * Nội dung và kiểu MIME của một file ảnh đã đọc từ đĩa.
	 *
	 * @param content     nội dung file
	 * @param contentType kiểu MIME
	 */
	public record StoredFile(byte[] content, String contentType) {
	}
}
