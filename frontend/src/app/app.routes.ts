import { Routes } from '@angular/router';
import { authGuard, authenticatedGuard, guestGuard } from './core/auth.guard';
import { Shell } from './layout/shell';
import { ChangePasswordPage } from './pages/change-password/change-password-page';
import { LoginPage } from './pages/login/login-page';
import { PlaceholderPage } from './pages/placeholder/placeholder-page';

/** Tạo route cho màn chưa làm, tiêu đề truyền qua data. */
const page = (path: string, title: string) => ({ path, component: PlaceholderPage, data: { title }, title: `${title} · Sweet Home` });

export const routes: Routes = [
  { path: 'dang-nhap', component: LoginPage, canActivate: [guestGuard], title: 'Đăng nhập · Sweet Home' },
  {
    path: 'doi-mat-khau',
    component: ChangePasswordPage,
    canActivate: [authenticatedGuard],
    title: 'Đổi mật khẩu · Sweet Home',
  },
  {
    path: '',
    component: Shell,
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tong-quan' },
      page('tong-quan', 'Tổng quan'),
      page('lich', 'Lịch đặt phòng'),
      page('don-thue', 'Đơn thuê'),
      page('don-thue/tao-moi', 'Tạo đơn thuê'),
      page('phong', 'Phòng & bảng giá'),
      page('nhan-vien', 'Nhân viên'),
      page('lich-lam', 'Lịch làm'),
      page('cai-dat', 'Cài đặt'),
    ],
  },
  { path: '**', redirectTo: '' },
];
