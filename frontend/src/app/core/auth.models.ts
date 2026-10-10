/** Vai trò tài khoản. */
export type AccountRole = 'MANAGER' | 'STAFF';

/** Thông tin tài khoản trả về từ backend, không chứa token (token nằm trong cookie HttpOnly). */
export interface AccountSummary {
  id: number;
  username: string;
  fullName: string;
  role: AccountRole;
  mustChangePassword: boolean;
}

/** Dữ liệu gửi lên khi đăng nhập. */
export interface LoginRequest {
  username: string;
  password: string;
  rememberDevice: boolean;
}

/** Dữ liệu gửi lên khi đổi mật khẩu. */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}
