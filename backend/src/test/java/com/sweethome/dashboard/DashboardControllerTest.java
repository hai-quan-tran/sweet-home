package com.sweethome.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import com.sweethome.auth.AccountRole;
import com.sweethome.auth.JwtService;

/**
 * Kiểm tra DashboardController: chỉ Quản lý được yêu cầu kèm doanh thu.
 */
class DashboardControllerTest {

	private final DashboardService service = mock(DashboardService.class);
	private final DashboardController controller = new DashboardController(service);

	@Test
	void passesManagerFlagFromRole() {
		DashboardDto manager = mock(DashboardDto.class);
		DashboardDto staff = mock(DashboardDto.class);
		when(service.overview(true)).thenReturn(manager);
		when(service.overview(false)).thenReturn(staff);

		assertThat(controller.overview(new JwtService.AuthenticatedPrincipal(1L, "admin", AccountRole.MANAGER))).isSameAs(manager);
		assertThat(controller.overview(new JwtService.AuthenticatedPrincipal(2L, "nv", AccountRole.STAFF))).isSameAs(staff);
	}
}
