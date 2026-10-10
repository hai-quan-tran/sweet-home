import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AccountSummary } from '../../core/auth.models';
import { ChangePasswordPage } from './change-password-page';

describe('ChangePasswordPage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangePasswordPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(ChangePasswordPage);
    fixture.detectChanges();
    return fixture;
  }

  it('mật khẩu mới không đạt quy tắc thì form không hợp lệ và không gửi request', () => {
    const fixture = create();
    fixture.componentInstance['form'].setValue({ oldPassword: 'old12345', newPassword: 'short', confirmPassword: 'short' });

    fixture.componentInstance.submit();

    expect(fixture.componentInstance['form'].invalid).toBe(true);
    httpMock.verify();
  });

  it('nhập lại mật khẩu không khớp thì form không hợp lệ', () => {
    const fixture = create();
    fixture.componentInstance['form'].setValue({ oldPassword: 'old12345', newPassword: 'newpass123', confirmPassword: 'khac123456' });

    expect(fixture.componentInstance['form'].hasError('mismatch')).toBe(true);
  });

  it('đổi mật khẩu thành công thì chuyển về Tổng quan', () => {
    const fixture = create();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.componentInstance['form'].setValue({ oldPassword: 'old12345', newPassword: 'newpass123', confirmPassword: 'newpass123' });

    fixture.componentInstance.submit();
    const account: AccountSummary = { id: 1, username: 'manager1', fullName: 'Quản lý', role: 'MANAGER', mustChangePassword: false };
    httpMock.expectOne('/api/auth/change-password').flush(account);

    expect(navigateSpy).toHaveBeenCalledWith('/tong-quan');
  });

  it('mật khẩu hiện tại sai thì hiện thông báo lỗi từ backend', () => {
    const fixture = create();
    fixture.componentInstance['form'].setValue({ oldPassword: 'saiRoi123', newPassword: 'newpass123', confirmPassword: 'newpass123' });

    fixture.componentInstance.submit();
    httpMock
      .expectOne('/api/auth/change-password')
      .flush({ detail: 'Mật khẩu hiện tại không đúng' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance['errorMessage']()).toBe('Mật khẩu hiện tại không đúng');
  });
});
