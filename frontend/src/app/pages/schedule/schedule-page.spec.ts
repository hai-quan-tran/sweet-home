import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountDto } from '../../core/account.models';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { ShiftTemplateDto, WorkShiftDto } from '../../core/schedule.models';
import { SchedulePage, dayIso, mondayOf, shiftHours } from './schedule-page';

describe('SchedulePage', () => {
  let httpMock: HttpTestingController;

  const monday = dayIso(mondayOf(new Date()));
  const sunday = (() => {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() + 6);
    return dayIso(d);
  })();
  const nextMonday = (() => {
    const d = mondayOf(new Date());
    d.setDate(d.getDate() + 7);
    return dayIso(d);
  })();

  const accounts: AccountDto[] = [
    { id: 5, username: 'hong', fullName: 'Lê Thị Hồng', phone: null, idNumberMasked: null, startDate: null, role: 'STAFF', status: 'ACTIVE' },
    { id: 6, username: 'vy', fullName: 'Nguyễn Thảo Vy', phone: null, idNumberMasked: null, startDate: nextMonday, role: 'STAFF', status: 'ACTIVE' },
    { id: 7, username: 'tuan', fullName: 'Trần Văn Tuấn', phone: null, idNumberMasked: null, startDate: null, role: 'STAFF', status: 'LOCKED' },
  ];
  const templates: ShiftTemplateDto[] = [
    { id: 1, name: 'Sáng', startTime: '06:00:00', endTime: '14:00:00', color: 1 },
    { id: 3, name: 'Đêm', startTime: '22:00:00', endTime: '06:00:00', color: 3 },
  ];
  const shifts: WorkShiftDto[] = [
    { id: 9, accountId: 5, templateId: 1, name: 'Sáng', color: 1, startAt: monday + 'T06:00:00', endAt: monday + 'T12:00:00', edited: true, note: 'Về sớm' },
    { id: 10, accountId: 5, templateId: 3, name: 'Đêm', color: 3, startAt: monday + 'T22:00:00', endAt: sunday + 'T06:00:00', edited: false, note: null },
  ];

  async function render(role: 'MANAGER' | 'STAFF') {
    const user: AccountSummary = { id: 1, username: 'u', fullName: 'Người dùng', role, mustChangePassword: false };
    await TestBed.configureTestingModule({
      imports: [SchedulePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } }],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SchedulePage);
    fixture.detectChanges();
    httpMock.expectOne('/api/accounts').flush(accounts);
    httpMock.expectOne('/api/shift-templates').flush(templates);
    httpMock.expectOne(`/api/shifts?from=${monday}&to=${nextMonday}`).flush(shifts);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('hiện người đang hoạt động, ca theo ngày, ngày trước khi bắt đầu làm là "—"', async () => {
    const el = (await render('MANAGER')).nativeElement as HTMLElement;
    expect(el.textContent).toContain('Lê Thị Hồng');
    expect(el.textContent).not.toContain('Trần Văn Tuấn');
    const rows = el.querySelectorAll('tbody tr');
    expect(rows[0].querySelectorAll('.sft').length).toBe(2);
    expect(rows[0].querySelector('.sft .pi-pencil')).not.toBeNull();
    expect(rows[1].querySelectorAll('.na').length).toBe(7);
    expect(rows[1].textContent).toContain('Bắt đầu làm từ');
  });

  it('tổng giờ tính cả ca đêm sang hôm sau', async () => {
    const fixture = await render('MANAGER');
    expect(shiftHours(shifts[0])).toBe(6);
    expect(fixture.componentInstance.totalHours(5)).toBe(`${6 + shiftHours(shifts[1])} giờ`);
  });

  it('Nhân viên chỉ xem: không có nút thêm ca, sao chép tuần, thêm ca mẫu; ca không bấm được', async () => {
    const el = (await render('STAFF')).nativeElement as HTMLElement;
    expect(el.querySelector('.add')).toBeNull();
    expect(el.textContent).not.toContain('Sao chép tuần trước');
    expect(el.textContent).not.toContain('Thêm ca mẫu');
    expect((el.querySelector('.sft') as HTMLButtonElement).disabled).toBe(true);
  });

  it('thêm ca: mặc định theo ca mẫu đầu, gửi POST rồi tải lại tuần', async () => {
    const fixture = await render('MANAGER');
    const page = fixture.componentInstance;
    page.openNew(5, monday);
    expect(page['shiftForm'].getRawValue()).toEqual({ templateId: 1, startTime: '06:00', endTime: '14:00', note: '' });

    page['shiftForm'].patchValue({ templateId: 3 });
    page.applyTemplate();
    page.saveShift();

    const req = httpMock.expectOne({ url: '/api/shifts', method: 'POST' });
    expect(req.request.body).toEqual({ accountId: 5, date: monday, templateId: 3, startTime: '22:00', endTime: '06:00', note: null });
    req.flush({});
    httpMock.expectOne(`/api/shifts?from=${monday}&to=${nextMonday}`).flush(shifts);
    expect(page['editing']()).toBeNull();
  });

  it('sửa ca: hiện gợi ý đã sửa giờ, lỗi trùng giờ từ backend hiện ra', async () => {
    const fixture = await render('MANAGER');
    const page = fixture.componentInstance;
    page.openShift(shifts[0]);
    expect(page['formTemplate']()?.changed).toBe(true);
    page.saveShift();

    httpMock.expectOne({ url: '/api/shifts/9', method: 'PUT' })
      .flush({ detail: 'Trùng giờ với ca khác của Lê Thị Hồng' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Trùng giờ với ca khác');
  });

  it('xoá ca và sao chép tuần trước có hỏi lại', async () => {
    const fixture = await render('MANAGER');
    const page = fixture.componentInstance;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    page.openShift(shifts[0]);
    page.deleteShift();
    httpMock.expectOne({ url: '/api/shifts/9', method: 'DELETE' }).flush(null);
    httpMock.expectOne(`/api/shifts?from=${monday}&to=${nextMonday}`).flush([]);

    page.copyPreviousWeek();
    httpMock.expectOne('/api/shifts/copy-week').flush({ copied: 3, skipped: 1 });
    httpMock.expectOne(`/api/shifts?from=${monday}&to=${nextMonday}`).flush([]);
    expect(page['info']()).toContain('Đã chép 3 ca, bỏ qua 1 ca');
  });

  it('chuyển tuần tải ca của tuần mới', async () => {
    const fixture = await render('MANAGER');
    fixture.componentInstance.moveWeek(1);
    const after = new Date(mondayOf(new Date()));
    after.setDate(after.getDate() + 14);
    httpMock.expectOne(`/api/shifts?from=${nextMonday}&to=${dayIso(after)}`).flush([]);
  });

  it('ca mẫu: thêm mới chọn màu chưa dùng, sửa và xoá', async () => {
    const fixture = await render('MANAGER');
    const page = fixture.componentInstance;
    page.openTemplate(null);
    expect(page['templateForm'].getRawValue().color).toBe(2);
    page['templateForm'].patchValue({ name: 'Gãy', startTime: '10:00', endTime: '15:00' });
    page.saveTemplate();
    httpMock.expectOne({ url: '/api/shift-templates', method: 'POST' }).flush({});
    httpMock.expectOne('/api/shift-templates').flush(templates);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    page.openTemplate(templates[1]);
    page.deleteTemplate();
    httpMock.expectOne({ url: '/api/shift-templates/3', method: 'DELETE' }).flush(null);
    expect(page['templates']().map((t) => t.id)).toEqual([1]);
  });
});
