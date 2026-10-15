import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountDto } from '../../core/account.models';
import { ActivityLogDto } from '../../core/activity-log.models';
import { periodStart } from '../../core/activity-log.service';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { WorkShiftDto } from '../../core/schedule.models';
import { dayIso } from '../schedule/schedule-page';
import { StaffPage } from './staff-page';
import { initials } from './staff-permissions';

describe('StaffPage', () => {
  let httpMock: HttpTestingController;

  const accounts: AccountDto[] = [
    { id: 5, username: 'hong', fullName: 'Lê Thị Hồng', phone: '0905218334', idNumberMasked: null, startDate: null, role: 'STAFF', status: 'ACTIVE' },
    { id: 6, username: 'tuan', fullName: 'Trần Văn Tuấn', phone: '0916772140', idNumberMasked: null, startDate: null, role: 'STAFF', status: 'LOCKED' },
    { id: 1, username: 'admin', fullName: 'Quản trị viên', phone: null, idNumberMasked: null, startDate: null, role: 'MANAGER', status: 'ACTIVE' },
  ];

  const today = periodStart('today').slice(0, 10);
  const logs: ActivityLogDto[] = [
    { id: 2, createdAt: today + 'T10:02:00', actor: 'hong', actorName: 'Lê Thị Hồng', action: 'CHECK_IN', detail: 'Nhận phòng', orderId: 30, orderCode: 'SH-1030', roomNumber: '202' },
    { id: 1, createdAt: '2026-01-05T07:00:00', actor: 'system', actorName: null, action: 'STATUS_AUTO', detail: 'Tự chuyển sang Đang ở', orderId: null, orderCode: null, roomNumber: '302' },
  ];

  /** Giờ máy lệch `offsetMinutes` phút so với bây giờ, dạng "YYYY-MM-DDTHH:mm:00". */
  const at = (offsetMinutes: number) => {
    const d = new Date(Date.now() + offsetMinutes * 60_000);
    return `${dayIso(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  };
  // Hồng (id 5) đang trong ca; Tuấn (id 6, đã khoá) có ca nhưng vẫn hiện "Đã khoá".
  const todayShifts: WorkShiftDto[] = [
    { id: 1, accountId: 5, templateId: null, name: 'Ca lẻ', color: 0, startAt: at(-60), endAt: at(60), edited: false, note: null },
    { id: 2, accountId: 6, templateId: null, name: 'Ca lẻ', color: 0, startAt: at(-60), endAt: at(60), edited: false, note: null },
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
    httpMock.expectOne((r) => r.url === '/api/shifts').flush(todayShifts);
    if (role === 'MANAGER') {
      httpMock.expectOne((r) => r.url === '/api/activity-logs').flush({ items: logs, total: 3 });
    }
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('hiện tài khoản, số người, tag Đã khoá và Quản lý', async () => {
    const el = (await render('MANAGER')).nativeElement as HTMLElement;
    expect(el.textContent).toContain('3 người');
    expect(el.textContent).toContain('Lê Thị Hồng');
    expect(el.textContent).toContain('Đã khoá');
    expect(el.querySelector('.tag.t-b')?.textContent).toContain('Quản lý');
  });

  it('Quản lý thấy nút Thêm nhân viên và bấm được vào tài khoản để sửa', async () => {
    const el = (await render('MANAGER')).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Thêm nhân viên');
    expect(el.querySelector('a[href="/nhan-vien/5/sua"]')).not.toBeNull();
  });

  it('Nhân viên không thấy nút Thêm nhân viên và không có link sửa', async () => {
    const el = (await render('STAFF')).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Thêm nhân viên');
    expect(el.querySelector('a[href*="/sua"]')).toBeNull();
    expect(el.textContent).toContain('Quyền của nhân viên');
  });

  it('Quản lý thấy nhật ký: giờ, Hệ thống, link đơn, nút Xem thêm', async () => {
    const fixture = await render('MANAGER');
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('table.log tbody tr');
    expect(rows[0].textContent).toContain('10:02');
    expect(rows[0].textContent).toContain('Lê Thị Hồng');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/don-thue?id=30');
    expect(rows[1].textContent).toContain('05/01 07:00');
    expect(rows[1].querySelector('.sys')?.textContent).toContain('Hệ thống');
    expect(rows[1].textContent).toContain('P302');
    expect(el.textContent).toContain('Xem thêm (1)');
  });

  it('đổi bộ lọc thì tải lại nhật ký từ trang đầu với người được chọn', async () => {
    const fixture = await render('MANAGER');
    fixture.componentInstance.setActor('system');
    const req = httpMock.expectOne((r) => r.url === '/api/activity-logs');
    expect(req.request.params.get('actor')).toBe('system');
    expect(req.request.params.get('page')).toBe('0');
    req.flush({ items: [], total: 0 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chưa có thao tác nào');
  });

  it('Xem thêm nối trang kế tiếp', async () => {
    const fixture = await render('MANAGER');
    fixture.componentInstance.loadLogs(false);
    const req = httpMock.expectOne((r) => r.url === '/api/activity-logs');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ items: [{ ...logs[0], id: 9 }], total: 3 });
    expect(fixture.componentInstance['logs']().length).toBe(3);
  });

  it('Nhân viên không thấy nhật ký', async () => {
    const el = (await render('STAFF')).nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Nhật ký thao tác');
  });

  it('tag ca: Đang trong ca; tài khoản khoá vẫn hiện Đã khoá', async () => {
    const el = (await render('STAFF')).nativeElement as HTMLElement;
    const rows = el.querySelectorAll('.people li');
    expect(rows[0].textContent).toContain('Đang trong ca');
    expect(rows[1].textContent).toContain('Đã khoá');
    expect(rows[1].textContent).not.toContain('Đang trong ca');
  });

  it('initials lấy chữ đầu của từ đầu và từ cuối', () => {
    expect(initials('Lê Thị Hồng')).toBe('LH');
    expect(initials('vy')).toBe('V');
    expect(initials('  ')).toBe('?');
  });
});
