import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { RoomDto } from '../../core/room.models';
import { SurchargeDto } from '../../core/surcharge.models';
import { RoomsPage } from './rooms-page';

describe('RoomsPage', () => {
  let httpMock: HttpTestingController;

  const sampleRoom: RoomDto = {
    id: 1,
    roomNumber: '101',
    name: 'Mộc',
    floor: 1,
    roomTypeId: 1,
    roomTypeName: 'Tiêu chuẩn',
    maxGuests: 2,
    bedConfig: null,
    description: null,
    pricingMode: 'ROOM_TYPE',
    ownTwoHourPrice: null,
    ownExtraHourPrice: null,
    ownOvernightPrice: null,
    ownDailyPrice: null,
    effectiveTwoHourPrice: 150000,
    effectiveExtraHourPrice: 50000,
    effectiveOvernightPrice: 350000,
    effectiveDailyPrice: 500000,
    defaultCheckInMode: 'SELF',
    checkInGuide: null,
    acceptingBookings: true,
    needsCleaning: false,
    photos: [],
  };

  const sampleSurcharge: SurchargeDto = {
    id: 1,
    name: 'Cuối tuần',
    whenType: 'WEEKDAY',
    amount: 10,
    graceMinutes: null,
    weekdays: ['FRIDAY', 'SATURDAY'],
    dateRanges: [],
    roomTypeIds: [1],
    roomTypeNames: ['Tiêu chuẩn'],
    active: true,
  };

  async function render(role: 'MANAGER' | 'STAFF', rooms: unknown[] = [sampleRoom]) {
    const user: AccountSummary = { id: 1, username: 'u', fullName: 'Người dùng', role, mustChangePassword: false };
    await TestBed.configureTestingModule({
      imports: [RoomsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RoomsPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/rooms').flush(rooms);
    httpMock.expectOne('/api/room-types/overview').flush({
      roomTypes: [{ id: 1, name: 'Tiêu chuẩn', twoHourPrice: 150000, extraHourPrice: 50000, overnightPrice: 350000, dailyPrice: 500000, roomNumbers: ['101'] }],
      hiddenRoomTypes: [],
      settings: { minHours: 2, overnightCheckIn: '21:00:00', overnightCheckOut: '12:00:00', dailyCheckIn: '14:00:00', dailyCheckOut: '12:00:00' },
    });
    httpMock.expectOne('/api/surcharges').flush([sampleSurcharge]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('Quản lý thấy nút Thêm phòng và Sửa', async () => {
    const fixture = await render('MANAGER');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Thêm phòng');
    expect(el.textContent).toContain('Sửa');
  });

  it('Nhân viên không thấy nút Thêm phòng, Sửa, Sửa bảng giá', async () => {
    const fixture = await render('STAFF');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Thêm phòng');
    expect(el.querySelector('a[href*="/sua"]')).toBeNull();
    expect(el.textContent).not.toContain('Sửa bảng giá');
  });

  it('hiện đúng tên phòng và giá từ API', async () => {
    const fixture = await render('MANAGER');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('101');
    expect(el.textContent).toContain('Mộc');
    expect(el.textContent).toContain('150.000đ');
  });

  it('bấm công tắc Nhận đặt phòng thì gọi API đổi trạng thái', async () => {
    const fixture = await render('MANAGER');
    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('.sw input')!;
    toggle.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const req = httpMock.expectOne({ url: '/api/rooms/1/accepting-bookings', method: 'PATCH' });
    expect(req.request.body).toEqual({ acceptingBookings: false });
    req.flush({ ...sampleRoom, acceptingBookings: false });
  });

  it('phòng Chờ dọn: Nhân viên bấm Đã dọn thì gọi API và bỏ tag', async () => {
    const fixture = await render('STAFF', [{ ...sampleRoom, needsCleaning: true }]);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Chờ dọn');

    fixture.componentInstance.markCleaned({ ...sampleRoom, needsCleaning: true } as any);
    httpMock.expectOne({ url: '/api/rooms/1/cleaned', method: 'POST' }).flush({ ...sampleRoom, needsCleaning: false });
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Chờ dọn');
  });

  it('chuyển sang tab Bảng giá thì hiện bảng giá theo hạng', async () => {
    const fixture = await render('MANAGER');
    const el = fixture.nativeElement as HTMLElement;
    const tabButton = Array.from(el.querySelectorAll('.tabs button')).find((b) => b.textContent?.trim() === 'Bảng giá')!;
    (tabButton as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Bảng giá theo hạng phòng');
    expect(el.textContent).toContain('Tiêu chuẩn');
  });

  function openSurchargeTab(fixture: ReturnType<typeof TestBed.createComponent<RoomsPage>>) {
    const el = fixture.nativeElement as HTMLElement;
    const tabButton = Array.from(el.querySelectorAll('.tabs button')).find((b) => b.textContent?.trim() === 'Phụ thu')!;
    (tabButton as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('tab Phụ thu hiện đúng tên và mức thu từ API', async () => {
    const fixture = await render('MANAGER');
    openSurchargeTab(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cuối tuần');
    expect(el.textContent).toContain('+10%');
  });

  it('Quản lý thấy nút Thêm phụ thu', async () => {
    const fixture = await render('MANAGER');
    openSurchargeTab(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thêm');
  });

  it('Nhân viên không thấy nút Thêm phụ thu', async () => {
    const fixture = await render('STAFF');
    openSurchargeTab(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ch button.btn-t')).toBeNull();
  });

  it('nhãn mức thu theo từng loại phụ thu', async () => {
    const page = (await render('MANAGER')).componentInstance;
    const label = (whenType: SurchargeDto['whenType'], amount: number | null) => page.amountLabel({ ...sampleSurcharge, whenType, amount });

    expect(label('OVERSTAY', null)).toBe('Giá mỗi giờ thêm');
    expect(label('DATE_RANGE', 20)).toBe('+20%');
    expect(label('EXTRA_GUEST', 50000)).toBe('50.000đ/khách');
    expect(label('MANUAL', 30000)).toBe('30.000đ/lần');
  });

  it('khôi phục phụ thu đã ẩn: thành công thì tải lại, lỗi thì hiện lý do', async () => {
    const page = (await render('MANAGER')).componentInstance;

    page.restoreSurcharge(sampleSurcharge);
    httpMock.expectOne({ url: '/api/surcharges/1/active', method: 'PATCH' }).flush(sampleSurcharge);
    httpMock.expectOne('/api/surcharges').flush([sampleSurcharge]);

    page.restoreSurcharge(sampleSurcharge);
    httpMock.expectOne({ url: '/api/surcharges/1/active', method: 'PATCH' })
      .flush({ detail: 'Đã có phụ thu quá giờ đang dùng' }, { status: 409, statusText: 'Conflict' });
    expect(page['restoreError']()).toBe('Đã có phụ thu quá giờ đang dùng');

    page.onSurchargeSaved();
    httpMock.expectOne('/api/surcharges').flush([]);
    expect(page['surcharges']()).toEqual([]);
  });

  it('lưu bảng giá xong thì cập nhật bảng giá và tải lại phòng', async () => {
    const page = (await render('MANAGER')).componentInstance;
    const overview = { roomTypes: [], hiddenRoomTypes: [], settings: { minHours: 3 } } as never;

    page.onPricingSaved(overview);
    expect(page['pricing']()).toBe(overview);
    httpMock.expectOne('/api/rooms').flush([]);
    httpMock.expectOne('/api/room-types/overview').flush(overview);
    httpMock.expectOne('/api/surcharges').flush([]);
    expect(page['rooms']()).toEqual([]);
  });

  it('bấm vào một phụ thu (Quản lý) thì mở dialog sửa', async () => {
    const fixture = await render('MANAGER');
    openSurchargeTab(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const item = el.querySelector<HTMLElement>('.fee')!;
    item.click();
    fixture.detectChanges();

    expect(fixture.componentInstance['editingSurcharge']()?.name).toBe('Cuối tuần');
    expect(fixture.componentInstance['surchargeDialogVisible']()).toBe(true);
  });
});
