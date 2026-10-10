package com.sweethome.room;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
	 * Lưu một file ảnh với tên ngẫu nhiên (giữ phần mở rộng gốc), tránh trùng và lộ tên file gốc.
	 *
	 * @param file file ảnh gửi lên
	 * @return tên file đã lưu trên đĩa
	 */
	public String save(MultipartFile file) {
		if (file.isEmpty() || file.getContentType() == null || !file.getContentType().startsWith("image/")) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "Chỉ nhận file ảnh (JPG, PNG)");
		}
		String extension = extensionOf(file.getOriginalFilename());
		String storedName = UUID.randomUUID() + extension;
		try {
			file.transferTo(rootDir.resolve(storedName));
		} catch (IOException e) {
			throw new UncheckedIOException("Không lưu được ảnh", e);
		}
		return storedName;
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
			String contentType = Files.probeContentType(path);
			return new StoredFile(content, contentType != null ? contentType : "application/octet-stream");
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

	private String extensionOf(String originalFilename) {
		if (originalFilename == null) {
			return "";
		}
		int dot = originalFilename.lastIndexOf('.');
		return dot >= 0 ? originalFilename.substring(dot) : "";
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
