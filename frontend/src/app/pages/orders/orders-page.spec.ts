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
    httpMock.expectOne('/api/message-templates').flush([sampleTemplate]);
    httpMock.expectOne('/api/settings/homestay').flush(sampleHomestay);
    httpMock.expectOne((r) => r.url === '/api/orders').flush({ items: [sampleOrder], total: 1, countByStatus: { BOOKED: 1 } });
    fixture.detectChanges();
    return fixture;
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

  it('chọn một đơn thì tải chi tiết và hướng dẫn phòng hiện hành', async () => {
    const fixture = await render();

    fixture.componentInstance.selectOrder(sampleOrder as any);

    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);
    fixture.detectChanges();

    expect(fixture.componentInstance['selectedOrder']()?.code).toBe('SH-1036');
    expect(fixture.componentInstance['selectedRoomGuide']()).toBe('Đi thang bộ lên tầng 1.');
  });

  it('mở màn kèm query param id thì tự tải chi tiết đơn đó', async () => {
    const fixture = await render({ id: '36' });

    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);
    fixture.detectChanges();

    expect(fixture.componentInstance['selectedOrder']()?.id).toBe(36);
  });

  it('hiện mã cửa khi bấm Hiện', async () => {
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);

    fixture.componentInstance.revealDoorCode();
    httpMock.expectOne('/api/orders/36/door-code').flush({ doorCode: '482915' });

    expect(fixture.componentInstance['doorCode']()).toBe('482915');
  });

  it('sao chép tin nhắn: tự lấy mã cửa nếu mẫu có {ma_cua} và chưa lấy', async () => {
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    fixture.componentInstance.copyMessage();
    httpMock.expectOne('/api/orders/36/door-code').flush({ doorCode: '482915' });
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('482915'));
  });
  it('thu tiền: mặc định số còn phải thu, lưu xong cập nhật đơn và đóng form', async () => {
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);

    fixture.componentInstance.openPaymentForm();
    expect(fixture.componentInstance['paymentAmount']()).toBe(250000);
    fixture.componentInstance.savePayment();

    const req = httpMock.expectOne({ url: '/api/orders/36/payments', method: 'POST' });
    expect(req.request.body).toEqual({ amount: 250000, method: 'CASH', note: null });
    req.flush({ ...sampleOrder, paidAmount: 350000, dueAmount: 0 });

    expect(fixture.componentInstance['selectedOrder']()?.dueAmount).toBe(0);
    expect(fixture.componentInstance['paymentFormId']()).toBeNull();
  });

  it('thu tiền: số tiền <= 0 thì báo lỗi, không gọi API', async () => {
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);

    fixture.componentInstance.openPaymentForm();
    fixture.componentInstance['paymentAmount'].set(0);
    fixture.componentInstance.savePayment();

    expect(fixture.componentInstance['paymentError']()).toContain('lớn hơn 0');
  });

  it('sửa và xoá khoản đã thu gọi PUT/DELETE, lỗi từ server hiện ra', async () => {
    const payment = { id: 7, amount: 50000, method: 'CASH', note: null, createdAt: '2026-10-07T14:00:00Z', createdBy: 'admin' };
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush({ ...sampleOrder, payments: [payment] });
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);

    fixture.componentInstance.openPaymentForm(payment as any);
    fixture.componentInstance.savePayment();
    httpMock.expectOne({ url: '/api/orders/36/payments/7', method: 'PUT' })
      .flush({ detail: 'Tổng đã thu vượt tổng tiền của đơn' }, { status: 400, statusText: 'Bad Request' });
    expect(fixture.componentInstance['paymentError']()).toBe('Tổng đã thu vượt tổng tiền của đơn');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.deletePayment(payment as any);
    httpMock.expectOne({ url: '/api/orders/36/payments/7', method: 'DELETE' }).flush(sampleOrder);
    expect(fixture.componentInstance['selectedOrder']()?.payments.length).toBe(0);
  });

  it('formatTime hiển thị giờ:phút, ngày/tháng', async () => {
    const fixture = await render();
    const iso = new Date(2026, 9, 7, 9, 5).toISOString();
    expect(fixture.componentInstance.formatTime(iso)).toBe('09:05, 07/10');
  });
  it('nhận phòng: hỏi lại, gọi API, cập nhật đơn và tải lại danh sách', async () => {
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.checkIn();
    httpMock.expectOne({ url: '/api/orders/36/check-in', method: 'POST' })
      .flush({ ...sampleOrder, status: 'CHECKED_IN', actualCheckInAt: '2026-10-07T21:05:00' });
    httpMock.expectOne((r) => r.url === '/api/orders').flush({ items: [], total: 0, countByStatus: {} });

    expect(fixture.componentInstance['selectedOrder']()?.status).toBe('CHECKED_IN');
  });

  it('nhận phòng lỗi thì hiện thông báo từ server', async () => {
    const fixture = await render();
    fixture.componentInstance.selectOrder(sampleOrder as any);
    httpMock.expectOne('/api/orders/36').flush(sampleOrder);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    fixture.componentInstance.checkIn();
    httpMock.expectOne({ url: '/api/orders/36/check-in', method: 'POST' })
      .flush({ detail: 'Chỉ nhận phòng được đơn ở trạng thái Đã đặt' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance['actionError']()).toContain('Đã đặt');
  });
  it('trả phòng: mở form tính trước, chọn phụ thu thêm tay, xác nhận thu số còn lại', async () => {
    const pending = { ...sampleOrder, status: 'PENDING_CHECKOUT', actualCheckInAt: '2026-10-07T21:00:00' };
    const fixture = await render();
    fixture.componentInstance.selectOrder(pending as any);
    httpMock.expectOne('/api/orders/36').flush(pending);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);

    fixture.componentInstance.openCheckout();
    const preview = httpMock.expectOne({ url: '/api/orders/36/checkout/preview', method: 'POST' });
    expect(preview.request.body).toEqual({
      actualCheckInAt: '2026-10-07T21:00', actualCheckOutAt: '2026-10-08T12:00', manualSurchargeIds: [], paymentMethod: 'CASH',
    });
    preview.flush({ newSurcharges: [], totalAmount: 350000, paidAmount: 100000, dueAmount: 250000, manualOptions: [{ id: 5, name: 'Dọn thêm', amount: 30000 }] });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dọn thêm');

    fixture.componentInstance.toggleManualSurcharge(5);
    const second = httpMock.expectOne({ url: '/api/orders/36/checkout/preview', method: 'POST' });
    expect(second.request.body.manualSurchargeIds).toEqual([5]);
    second.flush({ newSurcharges: [{ name: 'Dọn thêm', amount: 30000 }], totalAmount: 380000, paidAmount: 100000, dueAmount: 280000, manualOptions: [] });

    fixture.componentInstance.confirmCheckout();
    httpMock.expectOne({ url: '/api/orders/36/checkout', method: 'POST' }).flush({ ...pending, status: 'CHECKED_OUT' });
    httpMock.expectOne((r) => r.url === '/api/orders').flush({ items: [], total: 0, countByStatus: {} });

    expect(fixture.componentInstance['selectedOrder']()?.status).toBe('CHECKED_OUT');
    expect(fixture.componentInstance['checkoutOpen']()).toBe(false);
  });

  it('trả phòng: lỗi tính trước (giờ trả trước giờ nhận) hiện thông báo', async () => {
    const staying = { ...sampleOrder, status: 'CHECKED_IN' };
    const fixture = await render();
    fixture.componentInstance.selectOrder(staying as any);
    httpMock.expectOne('/api/orders/36').flush(staying);
    httpMock.expectOne('/api/rooms/1').flush(sampleRoom);

    fixture.componentInstance.openCheckout();
    httpMock.expectOne({ url: '/api/orders/36/checkout/preview', method: 'POST' })
      .flush({ detail: 'Giờ trả thực tế phải sau giờ nhận thực tế' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance['actionError']()).toContain('Giờ trả');
    fixture.componentInstance.closeCheckout();
    expect(fixture.componentInstance['checkoutOpen']()).toBe(false);
  });
});
