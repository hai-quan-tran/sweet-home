import { Routes } from '@angular/router';
import { Shell } from './layout/shell';
import { PlaceholderPage } from './pages/placeholder/placeholder-page';

/** Tạo route cho màn chưa làm, tiêu đề truyền qua data. */
const page = (path: string, title: string) => ({ path, component: PlaceholderPage, data: { title }, title: `${title} · Sweet Home` });

export const routes: Routes = [
  {
    path: '',
    component: Shell,
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
