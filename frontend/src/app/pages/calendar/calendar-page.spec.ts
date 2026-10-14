import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CalendarPage } from './calendar-page';

const room = (id: number, extra: object = {}) => ({
  id, roomNumber: String(100 + id), name: 'Phòng ' + id, defaultCheckInMode: 'SELF', acceptingBookings: true, needsCleaning: false, ...extra,
});

const stay = (extra: object) => ({
  orderId: 31, code: 'SH-1031', roomId: 1, status: 'CHECKED_IN', rentalType: 'HOURLY', checkInMode: 'SELF',
  guestName: 'Nguyễn Minh Anh', startAt: '2026-10-07T09:30:00', endAt: '2026-10-07T13:30:00', ...extra,
});

describe('CalendarPage', () => {
  let httpMock: HttpTestingController;

  /** Mở màn lúc 12:40 ngày 07/10/2026 (Thứ Tư), trả danh sách phòng và các chặng của ngày đó. */
  async function render(stays: object[] = [stay({})], rooms: object[] = [room(1), room(2, { acceptingBookings: false })]) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 7, 12, 40));
    await TestBed.configureTestingModule({
      imports: [CalendarPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CalendarPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/rooms').flush(rooms);
    httpMock.expectOne((r) => r.url === '/api/orders/stays'
      && r.params.get('from') === '2026-10-07T00:00:00' && r.params.get('to') === '2026-10-08T00:00:00').flush(stays);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('xem theo ngày: 24 cột giờ, khối đơn đặt đúng vị trí, vạch bây giờ', async () => {
    const { component, fixture } = await render();

    expect(component['columns']().length).toBe(24);
    expect(component['title']()).toBe('Thứ Tư, 07/10/2026');
    const block = component['rows']()[0].blocks[0];
    expect(block.left).toBeCloseTo((9.5 / 24) * 100);
    expect(block.width).toBeCloseTo((4 / 24) * 100);
    expect(block.cls).toBe('t-i');
    expect(block.label).toBe('09:30 – 13:30');
    expect(component['nowPercent']()).toBeCloseTo((12 + 40 / 60) / 24 * 100);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nguyễn Minh Anh');
  });

  it('chặng bắt đầu từ hôm trước bị cắt ở mép trái; đơn Quá giờ có phần quá giờ đến bây giờ', async () => {
    const { component } = await render([
      stay({ orderId: 1, startAt: '2026-10-06T21:00:00', endAt: '2026-10-07T12:00:00', status: 'OVERSTAY' }),
    ]);

    const block = component['rows']()[0].blocks[0];
    expect(block.left).toBe(0);
    expect(block.contL).toBe(true);
    expect(block.contR).toBe(false);
    expect(block.label).toBe('21:00 06/10 → 12:00 07/10');
    expect(block.over?.left).toBeCloseTo(50);
    expect(block.over?.width).toBeCloseTo((40 / 60 / 24) * 100);
  });

  it('xem theo tuần lấy từ thứ Hai, theo tháng lấy cả tháng, nút trước/sau và Hôm nay', async () => {
    const { component, fixture } = await render();

    component.setView('week');
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('from') === '2026-10-05T00:00:00' && r.params.get('to') === '2026-10-12T00:00:00').flush([]);
    expect(component['columns']()[0]).toBe('T2 05/10');
    expect(component['title']()).toBe('05/10 – 11/10/2026');

    component.setView('month');
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('from') === '2026-10-01T00:00:00' && r.params.get('to') === '2026-11-01T00:00:00').flush([]);
    expect(component['columns']().length).toBe(31);

    component.shift(1);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('from') === '2026-11-01T00:00:00' && r.params.get('to') === '2026-12-01T00:00:00').flush([]);
    expect(component['title']()).toBe('Tháng 11/2026');
    expect(component['nowPercent']()).toBeNull();

    component.goToday();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('from') === '2026-10-01T00:00:00').flush([]);
  });

  it('bấm ô trống mở Tạo đơn điền sẵn phòng, ngày, giờ; phòng tắt nhận đặt thì bỏ qua', async () => {
    const { component } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const track = { getBoundingClientRect: () => ({ left: 100, width: 960 }) } as unknown as HTMLElement;

    // Bấm ở 15/24 chiều ngang → 15:00
    component.createAt(room(1) as any, { clientX: 100 + 600, currentTarget: track } as unknown as MouseEvent);
    expect(navigate).toHaveBeenCalledWith(['/don-thue/tao-moi'], { queryParams: { roomId: 1, date: '2026-10-07', time: '15:00' } });

    navigate.mockClear();
    component.createAt(room(2, { acceptingBookings: false }) as any, { clientX: 300, currentTarget: track } as unknown as MouseEvent);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('xem theo tuần: bấm ô trống chỉ điền ngày, không điền giờ', async () => {
    const { component, fixture } = await render();
    component.setView('week');
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/orders/stays').flush([]);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const track = { getBoundingClientRect: () => ({ left: 0, width: 700 }) } as unknown as HTMLElement;

    component.createAt(room(1) as any, { clientX: 250, currentTarget: track } as unknown as MouseEvent);

    expect(navigate).toHaveBeenCalledWith(['/don-thue/tao-moi'], { queryParams: { roomId: 1, date: '2026-10-07' } });
  });

  it('bấm đơn thì mở chi tiết, bấm lại đơn đó thì đóng', async () => {
    const { component } = await render();

    component.select(31);
    expect(component['selectedId']()).toBe(31);
    component.select(31);
    expect(component['selectedId']()).toBeNull();
  });
});
