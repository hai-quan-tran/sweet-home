package com.sweethome.activity;

import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;
import com.sweethome.order.OrderDto;

/**
 * Ghi và xem nhật ký thao tác. Ghi trong cùng transaction với thao tác nghiệp vụ: thao tác lỗi (rollback)
 * thì không có dòng nhật ký. Người thao tác lấy giống cột audit (tên đăng nhập, "system" với tác vụ nền).
 */
@Service
public class ActivityLogService {

	static final String SYSTEM = "system";
	private static final int MAX_DETAIL = 255;
	private static final int MAX_PAGE_SIZE = 100;

	private final ActivityLogRepository repository;
	private final AccountRepository accountRepository;
	private final AuditorAware<String> auditorAware;
	private final Clock clock;

	public ActivityLogService(ActivityLogRepository repository, AccountRepository accountRepository,
			AuditorAware<String> auditorAware, Clock clock) {
		this.repository = repository;
		this.accountRepository = accountRepository;
		this.auditorAware = auditorAware;
		this.clock = clock;
	}

	/**
	 * Ghi một dòng nhật ký với người đang thao tác.
	 *
	 * @param action     loại thao tác
	 * @param orderId    id đơn liên quan, null nếu không có
	 * @param roomNumber số phòng liên quan, null nếu không có
	 * @param detail     nội dung hiển thị (cắt bớt nếu quá 255 ký tự)
	 */
	@Transactional
	public void log(ActivityAction action, Long orderId, String roomNumber, String detail) {
		ActivityLog entry = new ActivityLog();
		entry.setCreatedAt(LocalDateTime.now(clock));
		entry.setActor(auditorAware.getCurrentAuditor().orElse(SYSTEM));
		entry.setAction(action);
		entry.setDetail(detail.length() > MAX_DETAIL ? detail.substring(0, MAX_DETAIL) : detail);
		entry.setOrderId(orderId);
		entry.setRoomNumber(roomNumber);
		repository.save(entry);
	}

	/**
	 * Nhật ký từ một thời điểm, mới nhất trước, kèm họ tên hiện tại của người thao tác.
	 *
	 * @param from  từ thời điểm
	 * @param actor tên đăng nhập cần lọc, null = mọi người
	 * @param page  số trang (từ 0)
	 * @param size  số dòng mỗi trang (tối đa 100)
	 * @return một trang nhật ký
	 */
	@Transactional(readOnly = true)
	public ActivityLogDto.Page search(LocalDateTime from, String actor, int page, int size) {
		var result = repository.search(from, actor, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));
		Map<String, String> names = accountRepository.findAll().stream()
				.collect(Collectors.toMap(Account::getUsername, Account::getFullName, (a, b) -> a));
		Function<ActivityLog, ActivityLogDto> toDto = l -> new ActivityLogDto(l.getId(), l.getCreatedAt(), l.getActor(),
				names.get(l.getActor()), l.getAction(), l.getDetail(), l.getOrderId(),
				l.getOrderId() == null ? null : OrderDto.codeOf(l.getOrderId()), l.getRoomNumber());
		return new ActivityLogDto.Page(result.getContent().stream().map(toDto).toList(), result.getTotalElements());
	}

	/**
	 * Định dạng tiền cho nội dung nhật ký: 300000 → "300.000đ".
	 *
	 * @param amount số tiền (VND)
	 * @return chuỗi tiền
	 */
	public static String money(long amount) {
		return NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(amount) + "đ";
	}
}
