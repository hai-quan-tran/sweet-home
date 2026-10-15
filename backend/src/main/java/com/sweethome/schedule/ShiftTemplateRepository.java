package com.sweethome.schedule;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Truy vấn ca mẫu.
 */
public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {

	/**
	 * Danh sách ca mẫu theo giờ bắt đầu.
	 *
	 * @return ca mẫu
	 */
	List<ShiftTemplate> findAllByOrderByStartTimeAsc();
}
