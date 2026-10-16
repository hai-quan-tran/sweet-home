package com.sweethome.activity;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;

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

	/**
	 * Trong các đơn cho trước, đơn nào đã có thao tác loại này (vd đã sao chép tin nhắn có mã cửa = đã gửi mã).
	 *
	 * @param action   loại thao tác
	 * @param orderIds các đơn cần xét (không rỗng)
	 * @return id đơn có thao tác
	 */
	@Query("select distinct l.orderId from ActivityLog l where l.action = :action and l.orderId in :orderIds")
	Set<Long> findOrderIdsWithAction(@Param("action") ActivityAction action, @Param("orderIds") Collection<Long> orderIds);
}
