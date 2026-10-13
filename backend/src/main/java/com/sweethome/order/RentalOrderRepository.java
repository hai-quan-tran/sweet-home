package com.sweethome.order;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Truy vấn đơn thuê.
 */
public interface RentalOrderRepository extends JpaRepository<RentalOrder, Long> {

	/**
	 * Các đơn (chưa huỷ) của một phòng có khung giờ chồng lấn khung giờ cho trước, dùng kiểm tra
	 * trùng lịch trước khi tạo đơn mới.
	 *
	 * @param roomId     id phòng
	 * @param checkInAt  giờ nhận của đơn đang xét
	 * @param checkOutAt giờ trả của đơn đang xét
	 * @return danh sách đơn chồng lấn
	 */
	@Query("select o from RentalOrder o where o.room.id = :roomId and o.status <> com.sweethome.order.OrderStatus.CANCELLED "
			+ "and o.checkInAt < :checkOutAt and o.checkOutAt > :checkInAt order by o.checkInAt asc")
	List<RentalOrder> findOverlapping(@Param("roomId") Long roomId, @Param("checkInAt") LocalDateTime checkInAt,
			@Param("checkOutAt") LocalDateTime checkOutAt);

	/**
	 * Đơn cần tự chuyển trạng thái theo giờ: đơn khách tự check-in đã tới giờ nhận, hoặc đơn đang ở
	 * đã tới giờ trả.
	 *
	 * @param now thời điểm hiện tại
	 * @return danh sách đơn cần xét
	 */
	@Query("select o from RentalOrder o where (o.status = com.sweethome.order.OrderStatus.BOOKED "
			+ "and o.checkInMode = com.sweethome.room.CheckInMode.SELF and o.checkInAt <= :now) "
			+ "or (o.status = com.sweethome.order.OrderStatus.CHECKED_IN and o.checkOutAt <= :now)")
	List<RentalOrder> findDueForAutoTransition(@Param("now") LocalDateTime now);

	/**
	 * Danh sách đơn có lọc, mới nhất ở trên, dùng cho màn Đơn thuê.
	 *
	 * @param status    trạng thái, null nghĩa là mọi trạng thái
	 * @param roomId    id phòng, null nghĩa là mọi phòng
	 * @param search    tìm theo tên hoặc SĐT khách (LIKE, không phân biệt hoa thường), rỗng nghĩa là không lọc
	 * @param searchId  id đơn giải mã sẵn từ mã đơn (ví dụ "SH-1036" → 1036-1000), null nếu search không phải mã đơn
	 * @param pageable  trang và kích thước trang
	 * @return trang kết quả
	 */
	@Query("select o from RentalOrder o where (:status is null or o.status = :status) "
			+ "and (:roomId is null or o.room.id = :roomId) "
			+ "and (:search = '' or lower(o.guestName) like concat('%', :search, '%') "
			+ "or o.guestPhone like concat('%', :search, '%') or o.id = :searchId) "
			+ "order by o.checkInAt desc")
	Page<RentalOrder> search(@Param("status") OrderStatus status, @Param("roomId") Long roomId,
			@Param("search") String search, @Param("searchId") Long searchId, Pageable pageable);

	/**
	 * Số đơn theo từng trạng thái, áp cùng bộ lọc phòng/tìm kiếm như {@link #search} nhưng bỏ qua
	 * lọc trạng thái — dùng hiện số trên các tab lọc.
	 *
	 * @param roomId   id phòng, null nghĩa là mọi phòng
	 * @param search   tìm theo tên/SĐT khách, rỗng nghĩa là không lọc
	 * @param searchId id đơn giải mã sẵn từ mã đơn, null nếu search không phải mã đơn
	 * @return mảng {@code [status, count]} từng dòng
	 */
	@Query("select o.status, count(o) from RentalOrder o where (:roomId is null or o.room.id = :roomId) "
			+ "and (:search = '' or lower(o.guestName) like concat('%', :search, '%') "
			+ "or o.guestPhone like concat('%', :search, '%') or o.id = :searchId) group by o.status")
	List<Object[]> countByStatus(@Param("roomId") Long roomId, @Param("search") String search,
			@Param("searchId") Long searchId);
}
