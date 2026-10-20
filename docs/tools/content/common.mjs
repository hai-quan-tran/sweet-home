// Giá trị dùng chung cho nội dung tài liệu.

/** Người cập nhật ghi trong lịch sử của mỗi file. */
export const AUTHOR = 'hai-quan';

/** Lịch sử cập nhật ban đầu của mọi file. */
export const FIRST_VERSION = [{ version: '1.0', date: '2026-10-20', author: AUTHOR, content: 'Tạo mới.' }];

/**
 * Lịch sử của file có cập nhật ở GĐ 13 (sửa lỗi phát hiện khi làm tài liệu): bản 1.0 + dòng 1.1.
 *
 * @param {string} content nội dung thay đổi của bản 1.1
 */
export const fixVersion = (content) => [...FIRST_VERSION, { version: '1.1', date: '2026-10-20', author: AUTHOR, content }];

/** Nhãn vai trò. */
export const ROLES = {
  all: 'Quản lý, Nhân viên',
  manager: 'Chỉ Quản lý',
  guest: 'Chưa đăng nhập',
};

/** Menu trái theo frontend/src/app/layout/menu.ts: nhãn, route, icon. */
export const MENU_LABELS = [
  ['Tổng quan', '/tong-quan', 'pi-th-large'],
  ['Lịch đặt phòng', '/lich', 'pi-calendar'],
  ['Đơn thuê', '/don-thue', 'pi-clipboard'],
  ['Phòng & bảng giá', '/phong', 'pi-building'],
  ['Nhân viên', '/nhan-vien', 'pi-users'],
  ['Lịch làm', '/lich-lam', 'pi-clock'],
  ['Cài đặt', '/cai-dat', 'pi-sliders-h'],
];

/** Danh sách file detail design (tên file → nội dung), dùng cho mục lục ở file Tổng thể. */
export const DESIGN_FILES = [
  ['00_TongThe', 'Tổng thể: kiến trúc, ERD, bảng/cột DB, tác vụ nền, bảo mật, trạng thái đơn, danh sách API'],
  ['01_DangNhap', 'Màn Đăng nhập'],
  ['02_DoiMatKhau', 'Màn Đổi mật khẩu (bắt buộc ở lần đăng nhập đầu)'],
  ['03_KhungUngDung', 'Khung ứng dụng: menu trái, thanh trên, chuông thông báo, dark mode, đăng xuất'],
  ['04_TongQuan', 'Màn Tổng quan'],
  ['05_LichDatPhong', 'Màn Lịch đặt phòng'],
  ['06_DonThue', 'Màn Đơn thuê (danh sách, lọc, tìm kiếm)'],
  ['07_ChiTietDon', 'Chi tiết đơn: nhận/trả phòng, thu tiền, huỷ, mã cửa, sao chép tin nhắn'],
  ['08_TaoSuaDon', 'Màn Tạo / Sửa đơn thuê'],
  ['09_GiaHan', 'Dialog Gia hạn / Chuyển phòng'],
  ['10_Phong', 'Màn Phòng & bảng giá (tab Phòng, Bảng giá, Phụ thu)'],
  ['11_ThemSuaPhong', 'Màn Thêm / Sửa phòng'],
  ['12_BangGia', 'Dialog Sửa bảng giá'],
  ['13_PhuThu', 'Dialog Thêm / Sửa phụ thu'],
  ['14_NhanVien', 'Màn Nhân viên (tài khoản, quyền, nhật ký thao tác)'],
  ['15_ThemSuaNhanVien', 'Màn Thêm / Sửa nhân viên'],
  ['16_LichLam', 'Màn Lịch làm (xếp ca, ca mẫu, độ phủ ca)'],
  ['17_CaiDat', 'Màn Cài đặt (mẫu tin nhắn, thông tin homestay)'],
];
