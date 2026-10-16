import { Routes } from '@angular/router';
import { authGuard, authenticatedGuard, guestGuard, managerGuard } from './core/auth.guard';
import { Shell } from './layout/shell';
import { CalendarPage } from './pages/calendar/calendar-page';
import { ChangePasswordPage } from './pages/change-password/change-password-page';
import { DashboardPage } from './pages/dashboard/dashboard-page';
import { LoginPage } from './pages/login/login-page';
import { OrderFormPage } from './pages/orders/order-form-page';
import { OrdersPage } from './pages/orders/orders-page';
import { RoomFormPage } from './pages/rooms/room-form-page';
import { RoomsPage } from './pages/rooms/rooms-page';
import { SchedulePage } from './pages/schedule/schedule-page';
import { SettingsPage } from './pages/settings/settings-page';
import { StaffFormPage } from './pages/staff/staff-form-page';
import { StaffPage } from './pages/staff/staff-page';

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
      { path: 'tong-quan', component: DashboardPage, title: 'Tổng quan · Sweet Home' },
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
      { path: 'nhan-vien', component: StaffPage, title: 'Nhân viên · Sweet Home' },
      {
        path: 'nhan-vien/them',
        component: StaffFormPage,
        canActivate: [managerGuard],
        title: 'Thêm nhân viên · Sweet Home',
      },
      {
        path: 'nhan-vien/:id/sua',
        component: StaffFormPage,
        canActivate: [managerGuard],
        title: 'Sửa nhân viên · Sweet Home',
      },
      { path: 'lich-lam', component: SchedulePage, title: 'Lịch làm · Sweet Home' },
      { path: 'cai-dat', component: SettingsPage, title: 'Cài đặt · Sweet Home' },
    ],
  },
  { path: '**', redirectTo: '' },
];
