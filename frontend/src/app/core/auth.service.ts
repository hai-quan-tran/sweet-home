import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';

import { AccountSummary, ChangePasswordRequest, LoginRequest } from './auth.models';

const BASE = '/api/auth';

/**
 * Quản lý trạng thái đăng nhập. Token nằm trong cookie HttpOnly do backend đặt,
 * phía trình duyệt chỉ giữ thông tin tài khoản (không nhạy cảm) để hiển thị và phân quyền giao diện.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<AccountSummary | null>(null);

  /** Tài khoản đang đăng nhập, null nếu chưa đăng nhập hoặc chưa nạp xong. */
  readonly currentUser = this.user.asReadonly();

  /** Đăng nhập, lưu thông tin tài khoản nếu thành công. */
  login(request: LoginRequest): Observable<AccountSummary> {
    return this.http.post<AccountSummary>(`${BASE}/login`, request).pipe(tap((account) => this.user.set(account)));
  }

  /** Nạp lại thông tin tài khoản từ access token hiện có (gọi khi mở lại app). Trả null nếu chưa đăng nhập. */
  loadCurrentUser(): Observable<AccountSummary | null> {
    return this.http.get<AccountSummary>(`${BASE}/me`).pipe(
      tap((account) => this.user.set(account)),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
    );
  }

  private refreshInFlight: Observable<AccountSummary> | null = null;

  /**
   * Cấp lại access token từ refresh token trong cookie. Nhiều lời gọi cùng lúc (nhiều request 401
   * song song) chỉ gọi API refresh một lần, dùng chung kết quả, để tránh refresh token bị xoay 2 lần.
   */
  refresh(): Observable<AccountSummary> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http.post<AccountSummary>(`${BASE}/refresh`, {}).pipe(
        tap((account) => this.user.set(account)),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay(1),
      );
    }
    return this.refreshInFlight;
  }

  /** Đổi mật khẩu, cập nhật lại cờ mustChangePassword sau khi thành công. */
  changePassword(request: ChangePasswordRequest): Observable<AccountSummary> {
    return this.http
      .post<AccountSummary>(`${BASE}/change-password`, request)
      .pipe(tap((account) => this.user.set(account)));
  }

  /** Đăng xuất, xoá thông tin tài khoản phía trình duyệt kể cả khi gọi API lỗi. */
  logout(): Observable<void> {
    return this.http.post<void>(`${BASE}/logout`, {}).pipe(
      tap(() => this.user.set(null)),
      catchError(() => {
        this.user.set(null);
        return of(void 0);
      }),
    );
  }
}
