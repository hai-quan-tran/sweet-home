package com.sweethome.room;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trả nội dung file ảnh phòng. Tách khỏi {@link RoomController} vì đây không phải dữ liệu JSON.
 */
@RestController
@RequestMapping("/room-photos")
public class RoomPhotoController {

	private final RoomService roomService;

	public RoomPhotoController(RoomService roomService) {
		this.roomService = roomService;
	}

	/** Tải nội dung một ảnh phòng. */
	@GetMapping("/{photoId}")
	public ResponseEntity<byte[]> get(@PathVariable Long photoId) {
		RoomPhotoStorageService.StoredFile file = roomService.readPhoto(photoId);
		return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.contentType())).body(file.content());
	}
}
