import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardPage, shortMoney } from './dashboard-page';

const room = {
  roomId: 1, roomNumber: '101', roomName: 'Mộc', state: 'EMPTY', acceptingBookings: true, checkInMode: 'SELF',
  orderId: null, guestName: null, rentalType: null, checkInAt: null, checkOutAt: null, nextGuestName: null, nextCheckInAt: null,
};

const sample = {
  now: '2026-10-07T12:40:00',
  onShift: [{ fullName: 'Lê Thị Hồng', shiftName: 'Sáng' }],
  rooms: [
    { ...room, nextGuestName: 'Lê Thu Hà', nextCheckInAt: '2026-10-07T13:00:00' },
    { ...room, roomId: 2, roomNumber: '102', state: 'CHECKED_IN', checkInMode: 'STAFF', orderId: 10, guestName: 'Nguyễn Minh Anh',
      rentalType: 'HOURLY', checkInAt: '2026-10-07T09:30:00', checkOutAt: '2026-10-07T13:30:00' },
    { ...room, roomId: 3, roomNumber: '202', state: 'OVERSTAY', orderId: 11, guestName: 'Bùi Thanh Tâm',
      rentalType: 'HOURLY', checkInAt: '2026-10-07T10:00:00', checkOutAt: '2026-10-07T12:15:00' },
  ],
  checkInsToday: 8,
  checkedInToday: 3,
  tasks: [
    { kind: 'OVERSTAY', orderId: 11, orderCode: 'SH-1011', at: '2026-10-07T12:15:00', guestName: 'Bùi Thanh Tâm', roomNumber: '202',
      checkInMode: 'STAFF', staffName: null, dueAmount: 0, doorCodeSent: null },
    { kind: 'CHECK_IN', orderId: 20, orderCode: 'SH-1020', at: '2026-10-07T14:00:00', guestName: 'Ngô Phương', roomNumber: '301',
      checkInMode: 'SELF', staffName: null, dueAmount: 100000, doorCodeSent: false },
    { kind: 'CHECK_OUT', orderId: 10, orderCode: 'SH-1010', at: '2026-10-07T13:30:00', guestName: 'Nguyễn Minh Anh', roomNumber: '102',
      checkInMode: 'STAFF', staffName: 'Lê Thị Hồng', dueAmount: 150000, doorCodeSent: null },
  ],
  revenue: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: `2026-10-0${i + 1}`, revenue: i === 6 ? 1850000 : 1000000, paid: i === 6 ? 1350000 : 1000000 })),
  monthOrders: { HOURLY: 3, OVERNIGHT: 1, DAILY: 0 },
  occupancyPercent: 68,
};

describe('DashboardPage', () => {
  let httpMock: HttpTestingController;

  async function render(data: object) {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/dashboard').flush(data);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('Quản lý: 4 chỉ số, thẻ phòng, việc cần làm có nút xử lý nhanh, biểu đồ doanh thu', async () => {
    const fixture = await render(sample);
    const page = fixture.componentInstance;
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    expect(text).toContain('Đang trong ca: Lê Thị Hồng (Sáng)');
    expect(page['kpis']().map((k) => k.value)).toEqual(['1', '2', '8', '1.850.000']);
    expect(page['kpis']()[1].sub).toBe('1 phòng quá giờ trả');
    expect(page['rooms']()[0].line).toBe('Khách tiếp theo 13:00 · Lê Thu Hà');
    expect(page['rooms']()[1].line).toBe('09:30 → 13:30 · còn 50 phút');
    expect(page['rooms']()[1].progress).toBe(79);
    expect(page['rooms']()[2].tag).toBe('Quá giờ 25 phút');
    expect(page['tasks']().map((t) => t.action?.value ?? null)).toEqual(['checkout', 'copy', null]);
    expect(page['tasks']()[1].meta).toBe('P301 · tự nhận · chưa gửi mã');
    expect(page['tasks']()[2].meta).toBe('P102 · NV Hồng · thu 150.000đ');
    expect(page['chart']()?.cols.at(-1)).toMatchObject({ day: 'Hôm nay', height: 100, today: true });
    expect(page['mix']()?.items.map((i) => i.pct)).toEqual([75, 25, 0]);
    expect(text).toContain('Doanh thu 7 ngày');
  });

  it('Nhân viên: không có doanh thu', async () => {
    const fixture = await render({ ...sample, revenue: null });

    expect(fixture.componentInstance['kpis']().length).toBe(3);
    expect(fixture.componentInstance['chart']()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Doanh thu');
  });

  it('tiền rút gọn cho biểu đồ', () => {
    expect(shortMoney(1_250_000)).toBe('1,25tr');
    expect(shortMoney(350_000)).toBe('350k');
    expect(shortMoney(0)).toBe('0');
  });
});
