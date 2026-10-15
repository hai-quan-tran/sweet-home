import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AccountDto } from '../../core/account.models';
import { AccountService } from '../../core/account.service';
import { ActivityLogDto, ActivityPeriod, SYSTEM_ACTOR } from '../../core/activity-log.models';
import { ActivityLogService, periodStart } from '../../core/activity-log.service';
import { AuthService } from '../../core/auth.service';
import { STAFF_PERMISSIONS, initials } from './staff-permissions';

/**
 * Màn Nhân viên: danh sách tài khoản, quyền của vai trò Nhân viên; Quản lý thấy thêm nhật ký thao tác
 * (lọc theo thời gian, người) và thêm/sửa tài khoản.
 */
@Component({
  selector: 'app-staff-page',
  imports: [RouterLink, ButtonModule],
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss',
})
export class StaffPage {
  private readonly accountService = inject(AccountService);
  private readonly activityLogService = inject(ActivityLogService);
  private readonly auth = inject(AuthService);

  protected readonly permissions = STAFF_PERMISSIONS;
  protected readonly initials = initials;
  protected readonly systemActor = SYSTEM_ACTOR;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');
  protected readonly accounts = signal<AccountDto[]>([]);
  protected readonly loading = signal(true);

  protected readonly period = signal<ActivityPeriod>('today');
  protected readonly actor = signal<string | null>(null);
  protected readonly logs = signal<ActivityLogDto[]>([]);
  protected readonly logTotal = signal(0);
  protected readonly loadingLogs = signal(false);
  private logPage = 0;

  constructor() {
    this.accountService.list().subscribe((list) => {
      this.accounts.set(list);
      this.loading.set(false);
    });
    if (this.isManager()) {
      this.loadLogs(true);
    }
  }

  /** Đổi khoảng thời gian lọc nhật ký. */
  setPeriod(value: string): void {
    this.period.set(value as ActivityPeriod);
    this.loadLogs(true);
  }

  /** Đổi người thao tác cần lọc ("" = mọi người). */
  setActor(value: string): void {
    this.actor.set(value || null);
    this.loadLogs(true);
  }

  /** Tải nhật ký: từ trang đầu (khi đổi bộ lọc) hoặc trang kế tiếp nối vào cuối ("Xem thêm"). */
  loadLogs(reset: boolean): void {
    this.logPage = reset ? 0 : this.logPage + 1;
    this.loadingLogs.set(true);
    this.activityLogService.search(this.period(), this.actor(), this.logPage).subscribe((page) => {
      this.logs.update((list) => (reset ? page.items : [...list, ...page.items]));
      this.logTotal.set(page.total);
      this.loadingLogs.set(false);
    });
  }

  /** Giờ thao tác: hôm nay chỉ hiện "HH:mm", ngày khác thêm "dd/MM". */
  logTime(createdAt: string): string {
    const time = createdAt.slice(11, 16);
    if (createdAt.slice(0, 10) === periodStart('today').slice(0, 10)) {
      return time;
    }
    return `${createdAt.slice(8, 10)}/${createdAt.slice(5, 7)} ${time}`;
  }
}
