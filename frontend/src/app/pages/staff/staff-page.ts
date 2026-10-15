import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AccountDto } from '../../core/account.models';
import { AccountService } from '../../core/account.service';
import { AuthService } from '../../core/auth.service';
import { STAFF_PERMISSIONS, initials } from './staff-permissions';

/** Màn Nhân viên: danh sách tài khoản và quyền của vai trò Nhân viên. Chỉ Quản lý thêm/sửa. */
@Component({
  selector: 'app-staff-page',
  imports: [RouterLink, ButtonModule],
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss',
})
export class StaffPage {
  private readonly accountService = inject(AccountService);
  private readonly auth = inject(AuthService);

  protected readonly permissions = STAFF_PERMISSIONS;
  protected readonly initials = initials;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');
  protected readonly accounts = signal<AccountDto[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.accountService.list().subscribe((list) => {
      this.accounts.set(list);
      this.loading.set(false);
    });
  }
}
