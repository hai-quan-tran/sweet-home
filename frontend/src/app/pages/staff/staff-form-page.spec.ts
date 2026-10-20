import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AccountDto } from '../../core/account.models';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { REQUIRED_FIELDS_MESSAGE } from '../../core/form-errors';
import { StaffFormPage, randomPassword } from './staff-form-page';

describe('StaffFormPage', () => {
  let httpMock: HttpTestingController;

  const staff: AccountDto = {
    id: 5, username: 'hong', fullName: 'Lê Thị Hồng', phone: '0905218334', idNumberMasked: '•••••••• 7302',
    startDate: '2026-10-12', role: 'STAFF', status: 'ACTIVE',
  };

  async function render(id: string | null, currentUserId = 1) {
    const user: AccountSummary = { id: currentUserId, username: 'admin', fullName: 'Quản lý', role: 'MANAGER', mustChangePassword: false };
    await TestBed.configureTestingModule({
      imports: [StaffFormPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StaffFormPage);
    fixture.detectChanges();
    if (id) {
      httpMock.expectOne(`/api/accounts/${id}`).flush({ ...staff, id: Number(id) });
      fixture.detectChanges();
    }
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('thêm mới: thiếu mật khẩu thì không gửi request', async () => {
    const fixture = await render(null);
    fixture.componentInstance['form'].patchValue({ fullName: 'Vy', phone: '0978345120', username: 'vy.nguyen' });
    fixture.componentInstance.submit();
    httpMock.verify();
  });

  it('thêm mới: mật khẩu yếu thì không gửi request', async () => {
    const fixture = await render(null);
    fixture.componentInstance['form'].patchValue({ fullName: 'Vy', phone: '0978345120', username: 'vy.nguyen', password: 'abcdefgh' });
    fixture.componentInstance.submit();
    httpMock.verify();
    expect(fixture.componentInstance['errorMessage']()).toBe(REQUIRED_FIELDS_MESSAGE);
  });

  it('thêm mới: gửi POST đủ dữ liệu rồi về /nhan-vien', async () => {
    const fixture = await render(null);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance['form'].patchValue({ fullName: 'Vy', phone: '0978345120', username: 'vy.nguyen', password: 'Temp1234' });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne({ url: '/api/accounts', method: 'POST' });
    expect(req.request.body).toEqual({
      fullName: 'Vy', phone: '0978345120', idNumber: null, startDate: null, username: 'vy.nguyen', password: 'Temp1234',
      mustChangePassword: true, role: 'STAFF', active: true,
    });
    req.flush(staff);
    expect(navigate).toHaveBeenCalledWith('/nhan-vien');
  });

  it('sửa: nạp dữ liệu, mật khẩu để trống vẫn lưu được, gửi PUT kèm tên đăng nhập cũ', async () => {
    const fixture = await render('5');
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const form = fixture.componentInstance['form'];
    expect(form.controls.username.disabled).toBe(true);
    expect(form.controls.phone.value).toBe('0905218334');

    form.patchValue({ active: false });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne({ url: '/api/accounts/5', method: 'PUT' });
    expect(req.request.body.username).toBe('hong');
    expect(req.request.body.password).toBeNull();
    expect(req.request.body.active).toBe(false);
    req.flush(staff);
  });

  it('sửa chính mình: khoá ô vai trò và trạng thái', async () => {
    const fixture = await render('1', 1);
    const form = fixture.componentInstance['form'];
    expect(form.controls.role.disabled).toBe(true);
    expect(form.controls.active.disabled).toBe(true);
  });

  it('lỗi từ backend hiện thông báo', async () => {
    const fixture = await render(null);
    fixture.componentInstance['form'].patchValue({ fullName: 'Vy', phone: '0978345120', username: 'hong', password: 'Temp1234' });
    fixture.componentInstance.submit();
    httpMock.expectOne('/api/accounts').flush({ detail: 'Tên đăng nhập đã được dùng' }, { status: 409, statusText: 'Conflict' });
    expect(fixture.componentInstance['errorMessage']()).toBe('Tên đăng nhập đã được dùng');
  });

  it('randomPassword luôn đúng quy tắc mật khẩu', () => {
    for (let i = 0; i < 50; i++) {
      expect(randomPassword()).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{10}$/);
    }
  });
});
