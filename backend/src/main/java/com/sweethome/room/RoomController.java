package com.sweethome.room;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * API quản lý phòng. Xem dành cho mọi vai trò; thêm/sửa/bật-tắt/ảnh chỉ Quản lý.
 */
@RestController
@RequestMapping("/rooms")
public class RoomController {

	private final RoomService roomService;

	public RoomController(RoomService roomService) {
		this.roomService = roomService;
	}

	/** Danh sách phòng cho tab "Phòng". */
	@GetMapping
	public List<RoomDto> list() {
		return roomService.list();
	}

	/** Chi tiết một phòng, dùng cho màn Sửa phòng. */
	@GetMapping("/{id}")
	public RoomDto get(@PathVariable Long id) {
		return roomService.get(id);
	}

	/** Thêm phòng mới. */
	@PostMapping
	@PreAuthorize("hasRole('MANAGER')")
	public RoomDto create(@Valid @RequestBody RoomUpsertRequest request) {
		return roomService.create(request);
	}

	/** Sửa thông tin phòng. */
	@PutMapping("/{id}")
	@PreAuthorize("hasRole('MANAGER')")
	public RoomDto update(@PathVariable Long id, @Valid @RequestBody RoomUpsertRequest request) {
		return roomService.update(id, request);
	}

	/** Bật/tắt nhận đặt phòng (công tắc nhanh trên thẻ phòng). */
	@PatchMapping("/{id}/accepting-bookings")
	@PreAuthorize("hasRole('MANAGER')")
	public RoomDto setAcceptingBookings(@PathVariable Long id, @RequestBody AcceptingBookingsRequest request) {
		return roomService.setAcceptingBookings(id, request.acceptingBookings());
	}

	/** Thêm một hoặc nhiều ảnh vào cuối danh sách ảnh của phòng. */
	@PostMapping("/{id}/photos")
	@PreAuthorize("hasRole('MANAGER')")
	public RoomDto addPhotos(@PathVariable Long id, @RequestParam("files") List<MultipartFile> files) {
		return roomService.addPhotos(id, files);
	}

	/** Xoá một ảnh của phòng. */
	@DeleteMapping("/{id}/photos/{photoId}")
	@PreAuthorize("hasRole('MANAGER')")
	public RoomDto deletePhoto(@PathVariable Long id, @PathVariable Long photoId) {
		return roomService.deletePhoto(id, photoId);
	}
}
