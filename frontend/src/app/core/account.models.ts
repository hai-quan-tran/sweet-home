import { AccountRole } from './auth.models';

/** Trạng thái tài khoản. */
export type AccountStatus = 'ACTIVE' | 'LOCKED';

/** Tài khoản ở màn Nhân viên. CCCD chỉ có dạng che 4 số cuối. */
export interface AccountDto {
  id: number;
  username: string;
  fullName: string;
  phone: string | null;
  idNumberMasked: string | null;
  startDate: string | null;
  role: AccountRole;
  status: AccountStatus;
}

/** Dữ liệu thêm/sửa tài khoản. Khi sửa: mật khẩu, CCCD để trống = giữ giá trị cũ; tên đăng nhập không đổi. */
export interface AccountUpsertRequest {
  fullName: string;
  phone: string;
  idNumber: string | null;
  startDate: string | null;
  username: string;
  password: string | null;
  mustChangePassword: boolean;
  role: AccountRole;
  active: boolean;
}
