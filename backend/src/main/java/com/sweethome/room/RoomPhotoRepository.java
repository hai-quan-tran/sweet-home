package com.sweethome.room;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn ảnh phòng.
 */
public interface RoomPhotoRepository extends JpaRepository<RoomPhoto, Long> {

	/**
	 * Thứ tự lớn nhất hiện có trong các ảnh của một phòng, dùng để nối ảnh mới vào cuối.
	 *
	 * @param roomId id phòng
	 * @return thứ tự lớn nhất, -1 nếu phòng chưa có ảnh nào
	 */
	@Query("select coalesce(max(p.sortOrder), -1) from RoomPhoto p where p.room.id = :roomId")
	int findMaxSortOrder(@Param("roomId") Long roomId);
}
