package com.sweethome.room;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Truy vấn hạng phòng.
 */
public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {

	/**
	 * Tìm hạng phòng theo tên (không phân biệt hoa thường), dùng kiểm tra trùng tên.
	 *
	 * @param name tên hạng phòng
	 * @return hạng phòng nếu có
	 */
	Optional<RoomType> findByNameIgnoreCase(String name);
}
