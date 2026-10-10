import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';

const SKIP_REFRESH = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'];

/**
 * Gắn cookie cho mọi request tới API; khi gặp 401 (hết hạn access token) thì tự cấp lại token
 * rồi thử lại request đó một lần. Nếu refresh cũng thất bại, để lỗi 401 đi tiếp — các guard định
 * tuyến (xem auth.guard.ts) sẽ đưa người dùng về /dang-nhap ở lần chuyển màn kế tiếp. Interceptor
 * không tự điều hướng ở đây để tránh vòng lặp: route /dang-nhap cũng gọi loadCurrentUser(), nếu
 * interceptor lại điều hướng về chính /dang-nhap thì sẽ gọi lại vô hạn.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const withCreds = req.clone({ withCredentials: true });

  if (SKIP_REFRESH.some((path) => withCreds.url.includes(path))) {
    return next(withCreds);
  }

  return next(withCreds).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return authService.refresh().pipe(switchMap(() => next(withCreds)));
    }),
  );
};
