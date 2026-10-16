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
	 * Các đơn (chưa huỷ) có chặng ở phòng cho trước chồng lấn khung giờ cho trước, dùng kiểm tra
	 * trùng lịch trước khi tạo/sửa đơn.
	 *
	 * @param roomId     id phòng
	 * @param checkInAt  giờ bắt đầu khung giờ đang xét
	 * @param checkOutAt giờ kết thúc khung giờ đang xét
	 * @return danh sách đơn chồng lấn
	 */
	@Query("select o from RentalOrder o where o.status <> com.sweethome.order.OrderStatus.CANCELLED "
			+ "and exists (select s from OrderStay s where s.order = o and s.room.id = :roomId "
			+ "and s.startAt < :checkOutAt and s.endAt > :checkInAt) order by o.checkInAt asc")
	List<RentalOrder> findOverlapping(@Param("roomId") Long roomId, @Param("checkInAt") LocalDateTime checkInAt,
			@Param("checkOutAt") LocalDateTime checkOutAt);

	/**
	 * Các chặng (của đơn chưa huỷ) giao với khoảng thời gian cho trước, nạp sẵn đơn — dùng cho lịch
	 * đặt phòng.
	 *
	 * @param from đầu khoảng
	 * @param to   cuối khoảng (không tính)
	 * @return danh sách chặng theo giờ bắt đầu
	 */
	@Query("select s from OrderStay s join fetch s.order o where o.status <> com.sweethome.order.OrderStatus.CANCELLED "
			+ "and s.startAt < :to and s.endAt > :from order by s.startAt asc")
	List<OrderStay> findStaysBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

	/**
	 * Các chặng (của đơn khác, chưa huỷ) ở một phòng bắt đầu từ một thời điểm trở đi, sớm nhất trước —
	 * dùng tìm đơn kế tiếp khi gia hạn.
	 *
	 * @param roomId   id phòng
	 * @param orderId  đơn đang gia hạn (bỏ qua)
	 * @param from     thời điểm bắt đầu tìm
	 * @param pageable số dòng cần lấy
	 * @return danh sách chặng
	 */
	@Query("select s from OrderStay s join fetch s.order o where s.room.id = :roomId and o.id <> :orderId "
			+ "and o.status <> com.sweethome.order.OrderStatus.CANCELLED and s.startAt >= :from order by s.startAt asc")
	List<OrderStay> findStaysStartingFrom(@Param("roomId") Long roomId, @Param("orderId") Long orderId,
			@Param("from") LocalDateTime from, Pageable pageable);

	/**
	 * Chặng khách đã chuyển đi (có chặng sau trong cùng đơn) đã kết thúc nhưng phòng chưa chuyển Chờ dọn.
	 *
	 * @param now thời điểm hiện tại
	 * @return danh sách chặng, nạp sẵn phòng
	 */
	@Query("select s from OrderStay s join fetch s.room where s.cleaningRequested = false and s.endAt <= :now "
			+ "and s.order.status <> com.sweethome.order.OrderStatus.CANCELLED "
			+ "and exists (select n from OrderStay n where n.order = s.order and n.startAt >= s.endAt)")
	List<OrderStay> findMovedOutStaysToRelease(@Param("now") LocalDateTime now);

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
	 * Đơn cần nhân viên đón (chưa huỷ, hình thức nhân viên check-in) có giờ nhận phòng trong khoảng, kèm phòng.
	 *
	 * @param from từ thời điểm
	 * @param to   đến thời điểm (không gồm)
	 * @return đơn theo giờ nhận phòng
	 */
	@Query("select o from RentalOrder o join fetch o.room where o.status <> com.sweethome.order.OrderStatus.CANCELLED "
			+ "and o.checkInMode = com.sweethome.room.CheckInMode.STAFF and o.checkInAt >= :from and o.checkInAt < :to "
			+ "order by o.checkInAt")
	List<RentalOrder> findStaffPickupsBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

	/**
	 * Đơn khách đang ở (Đang ở, Quá giờ, Chờ xác nhận trả), kèm phòng, theo giờ trả — dùng cho Tổng quan và thông báo.
	 *
	 * @return đơn đang ở
	 */
	@Query("select o from RentalOrder o join fetch o.room where o.status in (com.sweethome.order.OrderStatus.CHECKED_IN, "
			+ "com.sweethome.order.OrderStatus.OVERSTAY, com.sweethome.order.OrderStatus.PENDING_CHECKOUT) order by o.checkOutAt")
	List<RentalOrder> findStaying();

	/**
	 * Chặng của đơn Đã đặt chưa kết thúc, kèm đơn và phòng, theo giờ bắt đầu — khách sắp tới của từng phòng.
	 *
	 * @param now thời điểm hiện tại
	 * @return chặng
	 */
	@Query("select s from OrderStay s join fetch s.order o join fetch s.room where o.status = com.sweethome.order.OrderStatus.BOOKED "
			+ "and s.endAt > :now order by s.startAt")
	List<OrderStay> findBookedStaysEndingAfter(@Param("now") LocalDateTime now);

	/**
	 * Mọi đơn (kể cả đã huỷ) có giờ nhận phòng trong {@code [from, to)} — tính doanh thu, lượt nhận, cơ cấu đơn.
	 *
	 * @param from từ thời điểm
	 * @param to   đến thời điểm (không gồm)
	 * @return đơn
	 */
	@Query("select o from RentalOrder o where o.checkInAt >= :from and o.checkInAt < :to")
	List<RentalOrder> findCheckingInBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

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
