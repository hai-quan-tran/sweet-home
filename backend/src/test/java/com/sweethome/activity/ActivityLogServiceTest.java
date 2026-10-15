package com.sweethome.activity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.sweethome.auth.Account;
import com.sweethome.auth.AccountRepository;

/**
 * Kiểm tra ghi nhật ký (người thao tác, thời điểm, cắt nội dung dài) và xem nhật ký (họ tên, mã đơn).
 */
@ExtendWith(MockitoExtension.class)
class ActivityLogServiceTest {

	private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
	private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 15, 10, 2);

	@Mock
	private ActivityLogRepository repository;
	@Mock
	private AccountRepository accountRepository;
	@Mock
	private AuditorAware<String> auditorAware;

	private ActivityLogService service;

	@BeforeEach
	void setUp() {
		service = new ActivityLogService(repository, accountRepository, auditorAware,
				Clock.fixed(NOW.atZone(ZONE).toInstant(), ZONE));
	}

	@Test
	void logRecordsCurrentUserTimeAndOrder() {
		when(auditorAware.getCurrentAuditor()).thenReturn(Optional.of("hong"));

		service.log(ActivityAction.CHECK_IN, 30L, "202", "Nhận phòng");

		verify(repository).save(argThat(l -> l.getActor().equals("hong") && l.getCreatedAt().equals(NOW)
				&& l.getAction() == ActivityAction.CHECK_IN && l.getOrderId() == 30L && l.getRoomNumber().equals("202")
				&& l.getDetail().equals("Nhận phòng")));
	}

	@Test
	void logWithoutUserIsSystemAndLongDetailIsTruncated() {
		when(auditorAware.getCurrentAuditor()).thenReturn(Optional.empty());

		service.log(ActivityAction.ACCOUNT_UPDATED, null, null, "x".repeat(300));

		verify(repository).save(argThat(l -> l.getActor().equals("system") && l.getDetail().length() == 255));
	}

	@Test
	void searchMapsActorNameAndOrderCode() {
		ActivityLog log = new ActivityLog();
		log.setCreatedAt(NOW);
		log.setActor("hong");
		log.setAction(ActivityAction.CHECK_IN);
		log.setDetail("Nhận phòng");
		log.setOrderId(30L);
		log.setRoomNumber("202");
		ActivityLog system = new ActivityLog();
		system.setActor("system");
		system.setAction(ActivityAction.STATUS_AUTO);
		system.setDetail("Tự chuyển sang Đang ở");
		when(repository.search(eq(NOW.toLocalDate().atStartOfDay()), eq(null), any(Pageable.class)))
				.thenReturn(new PageImpl<>(List.of(log, system)));
		Account hong = new Account();
		hong.setUsername("hong");
		hong.setFullName("Lê Thị Hồng");
		when(accountRepository.findAll()).thenReturn(List.of(hong));

		ActivityLogDto.Page page = service.search(NOW.toLocalDate().atStartOfDay(), null, 0, 500);

		assertThat(page.total()).isEqualTo(2);
		assertThat(page.items().get(0).actorName()).isEqualTo("Lê Thị Hồng");
		assertThat(page.items().get(0).orderCode()).isEqualTo("SH-1030");
		assertThat(page.items().get(1).actorName()).isNull();
		assertThat(page.items().get(1).orderCode()).isNull();
	}

	@Test
	void moneyUsesVietnameseGrouping() {
		assertThat(ActivityLogService.money(300000)).isEqualTo("300.000đ");
	}
}
