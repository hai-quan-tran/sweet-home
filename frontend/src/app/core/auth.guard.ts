import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AccountSummary } from './auth.models';
import { AuthService } from './auth.service';

/**
 * Bảo vệ các màn sau khi đăng nhập: chưa đăng nhập → về /dang-nhap; phải đổi mật khẩu
 * (lần đầu) → về /doi-mat-khau. Dùng cho canActivateChild của khung Shell nên chạy lại
 * mỗi khi chuyển màn, không chỉ lúc vào lần đầu.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (account: AccountSummary | null) => {
    if (!account) {
      return router.createUrlTree(['/dang-nhap'], { queryParams: { redirect: state.url } });
    }
    if (account.mustChangePassword) {
      return router.createUrlTree(['/doi-mat-khau']);
    }
    return true;
  };

  const existing = authService.currentUser();
  return existing !== null ? decide(existing) : authService.loadCurrentUser().pipe(map(decide));
};

/** Chỉ yêu cầu đã đăng nhập (dùng cho màn đổi mật khẩu, vào được cả khi đang bị bắt đổi). */
export const authenticatedGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (account: AccountSummary | null) =>
    account ? true : router.createUrlTree(['/dang-nhap'], { queryParams: { redirect: state.url } });

  const existing = authService.currentUser();
  return existing !== null ? decide(existing) : authService.loadCurrentUser().pipe(map(decide));
};

/** Đã đăng nhập rồi thì không vào lại màn đăng nhập nữa. */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const decide = (account: AccountSummary | null) => (account ? router.createUrlTree(['/tong-quan']) : true);

  const existing = authService.currentUser();
  return existing !== null ? decide(existing) : authService.loadCurrentUser().pipe(map(decide));
};
