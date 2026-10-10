import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { MENU } from './menu';

/**
 * Khung chung của các màn sau khi đăng nhập: menu trái, thanh trên cùng và vùng nội dung.
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
  protected readonly menu = MENU;

  /** Vai trò hiển thị trên thanh trên. */
  protected readonly ROLE_LABEL: Record<string, string> = { MANAGER: 'Quản lý', STAFF: 'Nhân viên' };

  /** Đăng xuất rồi quay về màn đăng nhập. */
  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/dang-nhap'));
  }
}
