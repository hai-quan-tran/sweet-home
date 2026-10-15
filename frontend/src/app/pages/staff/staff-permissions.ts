/** Một dòng quyền của vai trò Nhân viên (cố định theo vai trò, không cấu hình — business-rules.md). */
export interface PermissionItem {
  label: string;
  allowed: boolean;
}

/** Quyền của vai trò Nhân viên, hiện ở màn Nhân viên và Thêm/Sửa nhân viên. */
export const STAFF_PERMISSIONS: PermissionItem[] = [
  { label: 'Xem lịch phòng và đơn thuê', allowed: true },
  { label: 'Tạo đơn, nhận phòng, trả phòng, thu tiền', allowed: true },
  { label: 'Xem mã cửa của đơn trong ca mình trực', allowed: true },
  { label: 'Chọn mẫu và sao chép tin nhắn gửi khách', allowed: true },
  { label: 'Xem phòng, bảng giá, phụ thu, nhân viên và lịch làm', allowed: true },
  { label: 'Thêm, sửa phòng · sửa bảng giá · thêm, sửa phụ thu', allowed: false },
  { label: 'Thêm, sửa nhân viên · xem nhật ký thao tác', allowed: false },
  { label: 'Xếp, sửa lịch làm và ca mẫu', allowed: false },
  { label: 'Sửa mẫu tin nhắn, thông tin homestay', allowed: false },
  { label: 'Huỷ đơn đã thu tiền, sửa số tiền đã thu', allowed: false },
  { label: 'Xem doanh thu', allowed: false },
];

/** Chữ viết tắt cho ảnh đại diện: chữ đầu của từ đầu và từ cuối trong họ tên ("Lê Thị Hồng" → "LH"). */
export function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
