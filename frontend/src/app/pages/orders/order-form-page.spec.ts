import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { OrderFormPage } from './order-form-page';

const sampleRoom = {
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
  defaultCheckInMode: 'STAFF',
  checkInGuide: null,
  acceptingBookings: true,
  photos: [],
};

describe('OrderFormPage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  async function render() {
    await TestBed.configureTestingModule({
      imports: [OrderFormPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(OrderFormPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/rooms').flush([sampleRoom]);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('nạp danh sách phòng, mặc định chọn phòng đầu và hình thức check-in của phòng đó', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    expect(component['rooms']().length).toBe(1);
    expect(component['form'].controls.roomId.value).toBe(1);
    expect(component['form'].controls.checkInMode.value).toBe('STAFF');
  });

  it('chỉ lấy phòng đang nhận đặt', async () => {
    await TestBed.configureTestingModule({
      imports: [OrderFormPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrderFormPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/rooms').flush([sampleRoom, { ...sampleRoom, id: 2, acceptingBookings: false }]);
    fixture.detectChanges();

    expect(fixture.componentInstance['rooms']().length).toBe(1);
  });

  it('đổi loại thuê sang Theo ngày thì số lượng mặc định về 1', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    component['form'].controls.rentalType.setValue('DAILY');

    expect(component['form'].controls.quantity.value).toBe(1);
  });

  it('điền đủ form thì gọi preview sau khi gõ xong (debounce)', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component['form'].controls.guestName.setValue('Nguyễn Văn A');

    await new Promise((resolve) => setTimeout(resolve, 400));
    const req = httpMock.expectOne({ url: '/api/orders/preview', method: 'POST' });
    req.flush({
      checkInAt: '2026-10-07T15:00:00',
      checkOutAt: '2026-10-07T17:00:00',
      available: true,
      conflictMessage: null,
      roomPriceAmount: 150000,
      surcharges: [],
      totalAmount: 150000,
      dueAmount: 150000,
    });
    fixture.detectChanges();

    expect(component['preview']()?.available).toBe(true);
  });

  it('submit khi thiếu mã cửa (tự check-in) thì báo lỗi, không gọi API', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component['form'].setValue({
      rentalType: 'HOURLY',
      roomId: 1,
      checkInDate: '2026-10-07',
      checkInTime: '15:00',
      quantity: 3,
      checkInMode: 'SELF',
      doorCode: '',
      guestName: 'Nguyễn Văn A',
      guestPhone: '0900000000',
      guestIdNumber: '',
      guestCount: 2,
      source: 'ZALO',
      note: '',
      deposit: 0,
      depositMethod: 'TRANSFER',
      discount: 0,
      discountReason: '',
    });

    component.submit(false);

    expect(component['errorMessage']()).toContain('mã cửa');
    httpMock.expectNone({ url: '/api/orders', method: 'POST' });
  });

  it('submit hợp lệ thì tạo đơn và chuyển sang /don-thue kèm id', async () => {
    const fixture = await render();
    const navigateSpy = vi.spyOn(router, 'navigate');
    const component = fixture.componentInstance;
    component['form'].setValue({
      rentalType: 'HOURLY',
      roomId: 1,
      checkInDate: '2026-10-07',
      checkInTime: '15:00',
      quantity: 3,
      checkInMode: 'STAFF',
      doorCode: '',
      guestName: 'Nguyễn Văn A',
      guestPhone: '0900000000',
      guestIdNumber: '',
      guestCount: 2,
      source: 'ZALO',
      note: '',
      deposit: 0,
      depositMethod: 'TRANSFER',
      discount: 0,
      discountReason: '',
    });

    component.submit(true);
    const req = httpMock.expectOne({ url: '/api/orders', method: 'POST' });
    expect(req.request.body.checkInMode).toBe('STAFF');
    req.flush({ id: 42 });

    expect(navigateSpy).toHaveBeenCalledWith(['/don-thue'], { queryParams: { id: 42, copy: 1 } });
  });
});
