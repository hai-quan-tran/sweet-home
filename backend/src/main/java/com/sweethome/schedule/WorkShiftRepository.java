package com.sweethome.schedule;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn ca đã xếp.
 */
public interface WorkShiftRepository extends JpaRepository<WorkShift, Long> {

	/**
	 * Các ca giao với khoảng {@code [from, to)}, theo giờ bắt đầu.
	 *
	 * @param from từ thời điểm
	 * @param to   đến thời điểm (không gồm)
	 * @return ca
	 */
	@Query("select s from WorkShift s where s.startAt < :to and s.endAt > :from order by s.startAt")
	List<WorkShift> findOverlapping(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

	/**
	 * Các ca bắt đầu trong khoảng {@code [from, to)} (theo ngày của ca), dùng cho sao chép tuần.
	 *
	 * @param from từ thời điểm
	 * @param to   đến thời điểm (không gồm)
	 * @return ca
	 */
	List<WorkShift> findByStartAtGreaterThanEqualAndStartAtLessThan(LocalDateTime from, LocalDateTime to);

	/**
	 * Tài khoản đã có ca khác trùng giờ chưa.
	 *
	 * @param accountId tài khoản
	 * @param startAt   giờ bắt đầu ca mới
	 * @param endAt     giờ kết thúc ca mới
	 * @param excludeId bỏ qua ca này (đang sửa), -1 nếu thêm mới
	 * @return true nếu trùng
	 */
	@Query("select count(s) > 0 from WorkShift s where s.accountId = :accountId and s.id <> :excludeId "
			+ "and s.startAt < :endAt and s.endAt > :startAt")
	boolean existsOverlap(@Param("accountId") Long accountId, @Param("startAt") LocalDateTime startAt,
			@Param("endAt") LocalDateTime endAt, @Param("excludeId") Long excludeId);

	/**
	 * Gỡ liên kết ca mẫu khỏi các ca đã xếp trước khi xoá ca mẫu (ca giữ nguyên bản sao tên/màu/giờ).
	 *
	 * @param templateId ca mẫu sắp xoá
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("update WorkShift s set s.templateId = null where s.templateId = :templateId")
	void detachTemplate(@Param("templateId") Long templateId);
}
