package com.sweethome.activity;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn nhật ký thao tác.
 */
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

	/**
	 * Nhật ký từ một thời điểm, lọc theo người nếu có, mới nhất trước.
	 *
	 * @param from     từ thời điểm (gồm)
	 * @param actor    tên đăng nhập ("system" = Hệ thống), null = mọi người
	 * @param pageable trang
	 * @return một trang nhật ký
	 */
	@Query("select l from ActivityLog l where l.createdAt >= :from and (:actor is null or l.actor = :actor)"
			+ " order by l.createdAt desc, l.id desc")
	Page<ActivityLog> search(@Param("from") LocalDateTime from, @Param("actor") String actor, Pageable pageable);
}
