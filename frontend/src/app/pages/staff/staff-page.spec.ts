import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountDto } from '../../core/account.models';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { StaffPage } from './staff-page';
import { initials } from './staff-permissions';

describe('StaffPage', () => {
  let httpMock: HttpTestingController;

  const accounts: AccountDto[] = [
    { id: 5, username: 'hong', fullName: 'Lê Thị Hồng', phone: '0905218334', idNumberMasked: null, startDate: null, role: 'STAFF', status: 'ACTIVE' },
    { id: 6, username: 'tuan', fullName: 'Trần Văn Tuấn', phone: '0916772140', idNumberMasked: null, startDate: null, role: 'STAFF', status: 'LOCKED' },
    { id: 1, username: 'admin', fullName: 'Quản trị viên', phone: null, idNumberMasked: null, startDate: null, role: 'MANAGER', status: 'ACTIVE' },
  ];

  async function render(role: 'MANAGER' | 'STAFF') {
    const user: AccountSummary = { id: 1, username: 'u', fullName: 'Người dùng', role, mustChangePassword: false };
    await TestBed.configureTestingModule({
      imports: [StaffPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StaffPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/accounts').flush(accounts);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => httpMock.verify());

  it('hiện tài khoản, số người, tag Đã khoá và Quản lý', async () => {
    const el = await render('MANAGER');
    expect(el.textContent).toContain('3 người');
    expect(el.textContent).toContain('Lê Thị Hồng');
    expect(el.textContent).toContain('Đã khoá');
    expect(el.querySelector('.tag.t-b')?.textContent).toContain('Quản lý');
  });

  it('Quản lý thấy nút Thêm nhân viên và bấm được vào tài khoản để sửa', async () => {
    const el = await render('MANAGER');
    expect(el.textContent).toContain('Thêm nhân viên');
    expect(el.querySelector('a[href="/nhan-vien/5/sua"]')).not.toBeNull();
  });

  it('Nhân viên không thấy nút Thêm nhân viên và không có link sửa', async () => {
    const el = await render('STAFF');
    expect(el.textContent).not.toContain('Thêm nhân viên');
    expect(el.querySelector('a[href*="/sua"]')).toBeNull();
    expect(el.textContent).toContain('Quyền của nhân viên');
  });

  it('initials lấy chữ đầu của từ đầu và từ cuối', () => {
    expect(initials('Lê Thị Hồng')).toBe('LH');
    expect(initials('vy')).toBe('V');
    expect(initials('  ')).toBe('?');
  });
});
