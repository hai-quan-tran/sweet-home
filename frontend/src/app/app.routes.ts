import { Routes } from '@angular/router';
import { authGuard, authenticatedGuard, guestGuard, managerGuard } from './core/auth.guard';
import { Shell } from './layout/shell';
import { CalendarPage } from './pages/calendar/calendar-page';
import { ChangePasswordPage } from './pages/change-password/change-password-page';
import { LoginPage } from './pages/login/login-page';
import { OrderFormPage } from './pages/orders/order-form-page';
import { OrdersPage } from './pages/orders/orders-page';
import { PlaceholderPage } from './pages/placeholder/placeholder-page';
import { RoomFormPage } from './pages/rooms/room-form-page';
import { RoomsPage } from './pages/rooms/rooms-page';
import { SettingsPage } from './pages/settings/settings-page';

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
      { path: 'lich', component: CalendarPage, title: 'Lịch đặt phòng · Sweet Home' },
      { path: 'don-thue', component: OrdersPage, title: 'Đơn thuê · Sweet Home' },
      { path: 'don-thue/tao-moi', component: OrderFormPage, title: 'Tạo đơn thuê · Sweet Home' },
      { path: 'don-thue/:id/sua', component: OrderFormPage, title: 'Sửa đơn thuê · Sweet Home' },
      { path: 'phong', component: RoomsPage, title: 'Phòng & bảng giá · Sweet Home' },
      {
        path: 'phong/them',
        component: RoomFormPage,
        canActivate: [managerGuard],
        title: 'Thêm phòng · Sweet Home',
      },
      {
        path: 'phong/:id/sua',
        component: RoomFormPage,
        canActivate: [managerGuard],
        title: 'Sửa phòng · Sweet Home',
      },
      page('nhan-vien', 'Nhân viên'),
      page('lich-lam', 'Lịch làm'),
      { path: 'cai-dat', component: SettingsPage, title: 'Cài đặt · Sweet Home' },
    ],
  },
  { path: '**', redirectTo: '' },
];
