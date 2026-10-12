package com.sweethome.surcharge;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn phụ thu.
 */
public interface SurchargeRepository extends JpaRepository<Surcharge, Long> {

	/**
	 * Tìm các phụ thu đang hoạt động theo điều kiện áp dụng, dùng kiểm tra chỉ cho phép một
	 * phụ thu đang hoạt động cho mỗi điều kiện "singleton" (quá giờ, vượt số khách).
	 *
	 * @param whenType điều kiện áp dụng
	 * @return danh sách phụ thu đang hoạt động thuộc điều kiện này
	 */
	List<Surcharge> findByWhenTypeAndActiveTrue(SurchargeWhenType whenType);

	/**
	 * Các phụ thu đang hoạt động áp dụng cho một hạng phòng, dùng tính tiền đơn (GĐ4).
	 *
	 * @param roomTypeId id hạng phòng
	 * @return danh sách phụ thu đang hoạt động áp dụng cho hạng phòng này
	 */
	@Query("select s from Surcharge s join s.roomTypes rt where rt.id = :roomTypeId and s.active = true")
	List<Surcharge> findActiveByRoomTypeId(@Param("roomTypeId") Long roomTypeId);
}
