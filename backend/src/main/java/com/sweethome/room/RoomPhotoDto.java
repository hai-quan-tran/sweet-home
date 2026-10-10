package com.sweethome.room;

/**
 * Một ảnh phòng trả về cho frontend.
 *
 * @param id    id ảnh
 * @param url   đường dẫn tải ảnh
 * @param cover true nếu là ảnh bìa (thứ tự nhỏ nhất)
 */
public record RoomPhotoDto(Long id, String url, boolean cover) {

	/**
	 * Dựng từ entity, đường dẫn tải ảnh là {@code /api/room-photos/{id}}.
	 *
	 * @param photo ảnh phòng
	 * @param cover true nếu là ảnh bìa
	 * @return dữ liệu trả về cho frontend
	 */
	public static RoomPhotoDto from(RoomPhoto photo, boolean cover) {
		return new RoomPhotoDto(photo.getId(), "/api/room-photos/" + photo.getId(), cover);
	}
}
