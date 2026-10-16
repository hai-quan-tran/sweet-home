import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationDto } from '../core/notification.models';
import { NotificationService, describeNotification } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';
import { MENU } from './menu';

/**
 * Khung chung của các màn sau khi đăng nhập: menu trái, thanh trên cùng (kèm chuông thông báo) và vùng nội dung.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  protected readonly menu = MENU;

  /** Vai trò hiển thị trên thanh trên. */
  protected readonly ROLE_LABEL: Record<string, string> = { MANAGER: 'Quản lý', STAFF: 'Nhân viên' };

  protected readonly notifications = signal<NotificationDto | null>(null);
  protected readonly panelOpen = signal(false);
  /** Nội dung hiển thị từng thông báo. */
  protected readonly views = computed(() => {
    const d = this.notifications();
    return (d?.items ?? []).map((n) => ({ key: n.kind + n.orderId, ...describeNotification(n, d!.now) }));
  });

  constructor() {
    // Hỏi lại mỗi phút; lỗi một lần (mất mạng, hết phiên) không làm dừng việc hỏi lại.
    interval(60_000)
      .pipe(startWith(0), switchMap(() => this.notificationService.list().pipe(catchError(() => EMPTY))), takeUntilDestroyed())
      .subscribe((d) => this.notifications.set(d));
  }

  /** Mở/đóng bảng thông báo; mở thì tải lại ngay để thấy việc vừa xử lý xong. */
  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.panelOpen.update((open) => !open);
    if (this.panelOpen()) {
      this.notificationService.list().subscribe((d) => this.notifications.set(d));
    }
  }

  /** Bấm ra ngoài hoặc phím Esc thì đóng bảng thông báo. */
  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeNotifications(): void {
    this.panelOpen.set(false);
  }

  /** Đăng xuất rồi quay về màn đăng nhập. */
  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/dang-nhap'));
  }
}
