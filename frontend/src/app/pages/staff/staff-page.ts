import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AccountDto } from '../../core/account.models';
import { AccountService } from '../../core/account.service';
import { ActivityLogDto, ActivityPeriod, SYSTEM_ACTOR } from '../../core/activity-log.models';
import { ActivityLogService, periodStart } from '../../core/activity-log.service';
import { AuthService } from '../../core/auth.service';
import { WorkShiftDto } from '../../core/schedule.models';
import { ScheduleService } from '../../core/schedule.service';
import { dayIso } from '../schedule/schedule-page';
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
  private readonly scheduleService = inject(ScheduleService);
  private readonly auth = inject(AuthService);

  protected readonly permissions = STAFF_PERMISSIONS;
  protected readonly initials = initials;
  protected readonly systemActor = SYSTEM_ACTOR;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');
  protected readonly accounts = signal<AccountDto[]>([]);
  protected readonly loading = signal(true);
  private readonly shifts = signal<WorkShiftDto[]>([]);
  /** Tag ca hôm nay theo tài khoản: đang trong ca, hoặc giờ vào ca kế tiếp trong hôm nay. */
  protected readonly shiftTags = computed(() => {
    const now = new Date();
    const nowIso = `${dayIso(now)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const tags = new Map<number, { text: string; cls: string }>();
    for (const s of this.shifts()) {
      if (s.startAt.slice(0, 16) <= nowIso && s.endAt.slice(0, 16) > nowIso) {
        tags.set(s.accountId, { text: 'Đang trong ca', cls: 't-i' });
      } else if (s.startAt.slice(0, 16) > nowIso && s.startAt.startsWith(dayIso(now)) && !tags.has(s.accountId)) {
        tags.set(s.accountId, { text: `Vào ca ${s.startAt.slice(11, 16)}`, cls: 't-o' });
      }
    }
    return tags;
  });

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
    // Ca đêm hôm qua có thể kéo sang hôm nay nên lấy từ hôm qua; danh sách ca đã theo giờ bắt đầu.
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    this.scheduleService.listShifts(dayIso(from), dayIso(to)).subscribe((list) => this.shifts.set(list));
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
