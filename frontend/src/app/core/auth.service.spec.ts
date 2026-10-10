import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountSummary } from './auth.models';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const account: AccountSummary = {
    id: 1,
    username: 'manager1',
    fullName: 'Nguyễn Quản Lý',
    role: 'MANAGER',
    mustChangePassword: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('login thành công thì lưu thông tin tài khoản', () => {
    let result: AccountSummary | undefined;
    service.login({ username: 'manager1', password: 'secret12', rememberDevice: false }).subscribe((r) => (result = r));

    httpMock.expectOne('/api/auth/login').flush(account);

    expect(result).toEqual(account);
    expect(service.currentUser()).toEqual(account);
  });

  it('loadCurrentUser thất bại thì trả null và không lưu tài khoản', () => {
    let result: AccountSummary | null | undefined;
    service.loadCurrentUser().subscribe((r) => (result = r));

    httpMock.expectOne('/api/auth/me').flush('lỗi', { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('refresh gọi đồng thời chỉ gửi một request API', () => {
    service.refresh().subscribe();
    service.refresh().subscribe();

    httpMock.expectOne('/api/auth/refresh').flush(account);
  });

  it('logout xoá tài khoản dù API lỗi', () => {
    service.login({ username: 'manager1', password: 'secret12', rememberDevice: false }).subscribe();
    httpMock.expectOne('/api/auth/login').flush(account);

    let completed = false;
    service.logout().subscribe(() => (completed = true));
    httpMock.expectOne('/api/auth/logout').flush('lỗi', { status: 500, statusText: 'Server Error' });

    expect(completed).toBe(true);
    expect(service.currentUser()).toBeNull();
  });
});
