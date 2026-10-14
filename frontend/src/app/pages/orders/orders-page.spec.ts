import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { OrdersPage } from './orders-page';

const sampleRoom = {
  id: 1, roomNumber: '101', name: 'Mộc', floor: 1, roomTypeId: 1, roomTypeName: 'Tiêu chuẩn',
  maxGuests: 2, bedConfig: null, description: null, pricingMode: 'ROOM_TYPE',
  ownTwoHourPrice: null, ownExtraHourPrice: null, ownOvernightPrice: null, ownDailyPrice: null,
  effectiveTwoHourPrice: 150000, effectiveExtraHourPrice: 50000, effectiveOvernightPrice: 350000, effectiveDailyPrice: 500000,
  defaultCheckInMode: 'SELF', checkInGuide: 'Đi thang bộ lên tầng 1.', acceptingBookings: true, photos: [],
};

const sampleTemplate = { id: 9, name: 'Hướng dẫn tự nhận phòng', body: 'Chào {ten_khach}, mã cửa {ma_cua}', defaultForCheckInMode: 'SELF', containsDoorCode: true };

const sampleHomestay = { name: 'Sweet Home', hotline: '0909123456', address: 'Địa chỉ', mapLink: null, wifiName: null, wifiPassword: null };

const sampleOrder = {
  id: 36, code: 'SH-1036', status: 'BOOKED', roomId: 1, roomNumber: '101', roomName: 'Mộc', roomTypeNameSnapshot: 'Tiêu chuẩn',
  rentalType: 'OVERNIGHT', checkInAt: '2026-10-07T21:00:00', checkOutAt: '2026-10-08T12:00:00',
  guestName: 'Phạm Quốc Bảo', guestPhone: '0903112457', guestIdNumberMasked: null, guestCount: 2,
  source: 'ZALO', note: null, checkInMode: 'SELF', hasDoorCode: true, deposit: 100000, depositMethod: 'TRANSFER',
  discount: 0, discountReason: null, roomPriceAmount: 350000, surcharges: [], totalAmount: 350000, payments: [], paidAmount: 100000,
  dueAmount: 250000,
};

describe('OrdersPage', () => {
  let httpMock: HttpTestingController;

  async function render(queryParams: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) }, queryParamMap: convertToParamMap(queryParams) },
        },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/rooms').flush([sampleRoom]);
    httpMock.expectOne((r) => r.url === '/api/orders').flush({ items: [sampleOrder], total: 1, countByStatus: { BOOKED: 1 } });
    fixture.detectChanges();
    return fixture;
  }

  /** Trả các request mà chi tiết đơn (OrderDetail) gọi khi mở đơn 36. */
  function flushDetail() {
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/message-templates').flush([sampleTemplate]);
    httpMock.expectOne('/api/settings/homestay').flush(sampleHomestay);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);
  }

  afterEach(() => httpMock.verify());

  it('nạp danh sách đơn khi vào màn', async () => {
    const fixture = await render();
    expect(fixture.componentInstance['listResponse']()?.items.length).toBe(1);
  });

  it('đổi tab trạng thái thì gọi lại API với status mới', async () => {
    const fixture = await render();
    fixture.componentInstance.setStatus('CHECKED_IN');

    const req = httpMock.expectOne((r) => r.url === '/api/orders' && r.params.get('status') === 'CHECKED_IN');
    req.flush({ items: [], total: 0, countByStatus: {} });
  });

  it('chọn một đơn thì hiện chi tiết đơn đó', async () => {
    const fixture = await render();

    fixture.componentInstance.selectOrder(sampleOrder as any);
    fixture.detectChanges();
    flushDetail();
    fixture.detectChanges();

    expect(fixture.componentInstance['selectedId']()).toBe(36);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-order-detail')?.textContent).toContain('SH-1036');
  });

  it('mở màn kèm query param id thì tự mở chi tiết đơn đó, copy=1 thì bật tự sao chép', async () => {
    const fixture = await render({ id: '36', copy: '1' });
    flushDetail();
    httpMock.expectOne('/api/orders/36/door-code').flush({ doorCode: '482915' });

    expect(fixture.componentInstance['selectedId']()).toBe(36);
    expect(fixture.componentInstance['autoCopy']()).toBe(true);
  });

  it('chi tiết đơn báo đổi trạng thái thì tải lại danh sách', async () => {
    const fixture = await render();
    fixture.componentInstance.reload();
    httpMock.expectOne((r) => r.url === '/api/orders').flush({ items: [], total: 0, countByStatus: {} });

    expect(fixture.componentInstance['listResponse']()?.total).toBe(0);
  });
});
