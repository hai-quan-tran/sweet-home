import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountSummary } from '../../core/auth.models';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture;
  }

  it('đăng nhập thành công và không bị bắt đổi mật khẩu thì vào Tổng quan', async () => {
    const fixture = create();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.componentInstance['form'].setValue({ username: 'manager1', password: 'secret12', rememberDevice: false });

    fixture.componentInstance.submit();
    const account: AccountSummary = { id: 1, username: 'manager1', fullName: 'Quản lý', role: 'MANAGER', mustChangePassword: false };
    httpMock.expectOne('/api/auth/login').flush(account);

    expect(navigateSpy).toHaveBeenCalledWith('/tong-quan');
  });

  it('đăng nhập thành công nhưng phải đổi mật khẩu thì vào /doi-mat-khau', () => {
    const fixture = create();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.componentInstance['form'].setValue({ username: 'staff1', password: 'secret12', rememberDevice: false });

    fixture.componentInstance.submit();
    const account: AccountSummary = { id: 2, username: 'staff1', fullName: 'Nhân viên', role: 'STAFF', mustChangePassword: true };
    httpMock.expectOne('/api/auth/login').flush(account);

    expect(navigateSpy).toHaveBeenCalledWith('/doi-mat-khau');
  });

  it('sai tài khoản/mật khẩu thì hiện thông báo lỗi', () => {
    const fixture = create();
    fixture.componentInstance['form'].setValue({ username: 'manager1', password: 'wrong', rememberDevice: false });

    fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush('sai', { status: 401, statusText: 'Unauthorized' });

    expect(fixture.componentInstance['errorMessage']()).toBe('Tên đăng nhập hoặc mật khẩu không đúng.');
  });

  it('không gửi request khi form thiếu dữ liệu', () => {
    create();
    httpMock.verify();
  });
});
