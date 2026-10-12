package com.sweethome.surcharge;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

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
}
