package com.sweethome.room;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Truy vấn phòng.
 */
public interface RoomRepository extends JpaRepository<Room, Long> {

	/**
	 * Tìm phòng theo số phòng (không phân biệt hoa thường), dùng kiểm tra trùng số phòng.
	 *
	 * @param roomNumber số phòng
	 * @return phòng nếu có
	 */
	Optional<Room> findByRoomNumberIgnoreCase(String roomNumber);

	/**
	 * Danh sách phòng thuộc một hạng, dùng kiểm tra trước khi xoá hạng phòng.
	 *
	 * @param roomTypeId id hạng phòng
	 * @return danh sách phòng
	 */
	List<Room> findByRoomTypeId(Long roomTypeId);

	/**
	 * Toàn bộ phòng, sắp theo số phòng, dùng cho màn danh sách.
	 *
	 * @return danh sách phòng
	 */
	List<Room> findAllByOrderByRoomNumberAsc();
}
