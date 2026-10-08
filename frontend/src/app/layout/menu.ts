/** Một mục trên menu trái. */
export interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

/** Menu chính theo thứ tự trong thiết kế. */
export const MENU: MenuItem[] = [
  { path: '/tong-quan', label: 'Tổng quan', icon: 'pi-th-large' },
  { path: '/lich', label: 'Lịch đặt phòng', icon: 'pi-calendar' },
  { path: '/don-thue', label: 'Đơn thuê', icon: 'pi-clipboard' },
  { path: '/phong', label: 'Phòng & bảng giá', icon: 'pi-building' },
  { path: '/nhan-vien', label: 'Nhân viên', icon: 'pi-users' },
  { path: '/lich-lam', label: 'Lịch làm', icon: 'pi-clock' },
  { path: '/cai-dat', label: 'Cài đặt', icon: 'pi-sliders-h' },
];
