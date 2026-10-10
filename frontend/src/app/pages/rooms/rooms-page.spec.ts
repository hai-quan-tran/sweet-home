import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { RoomDto } from '../../core/room.models';
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
    photos: [],
  };

  async function render(role: 'MANAGER' | 'STAFF') {
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
    httpMock.expectOne('/api/rooms').flush([sampleRoom]);
    httpMock.expectOne('/api/room-types/overview').flush({
      roomTypes: [{ id: 1, name: 'Tiêu chuẩn', twoHourPrice: 150000, extraHourPrice: 50000, overnightPrice: 350000, dailyPrice: 500000, roomNumbers: ['101'] }],
      hiddenRoomTypes: [],
      settings: { minHours: 2, overnightCheckIn: '21:00:00', overnightCheckOut: '12:00:00', dailyCheckIn: '14:00:00', dailyCheckOut: '12:00:00' },
    });
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

  it('chuyển sang tab Bảng giá thì hiện bảng giá theo hạng', async () => {
    const fixture = await render('MANAGER');
    const el = fixture.nativeElement as HTMLElement;
    const tabButton = Array.from(el.querySelectorAll('.tabs button')).find((b) => b.textContent?.trim() === 'Bảng giá')!;
    (tabButton as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Bảng giá theo hạng phòng');
    expect(el.textContent).toContain('Tiêu chuẩn');
  });
});
