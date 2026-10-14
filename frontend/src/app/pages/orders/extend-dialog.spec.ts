import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExtendDialog } from './extend-dialog';

const order = {
  id: 29, code: 'SH-1029', status: 'CHECKED_IN', roomId: 1, roomNumber: '201', roomName: 'Biển', rentalType: 'DAILY',
  checkInMode: 'STAFF', guestName: 'Hoàng Yến', checkInAt: '2026-10-06T14:00:00', checkOutAt: '2026-10-08T12:00:00',
};

const preview = (extra: object = {}) => ({
  hourPrice: 60000, dayPrice: 650000, currentCheckOutAt: '2026-10-08T12:00:00', newCheckOutAt: '2026-10-08T13:00:00',
  fee: 60000, nextOrder: { code: 'SH-1044', guestName: 'Lý Gia Bảo', checkInAt: '2026-10-08T14:00:00' },
  maxCheckOutAt: '2026-10-08T13:00:00', maxExtraHours: 1, available: true, moveOptions: [], ...extra,
});

describe('ExtendDialog', () => {
  let httpMock: HttpTestingController;

  /** Mở dialog, trả kết quả xem trước mặc định (thêm 1 giờ). */
  async function open(first: object = preview()) {
    await TestBed.configureTestingModule({
      imports: [ExtendDialog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ExtendDialog);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const req = httpMock.expectOne({ url: '/api/orders/29/extend/preview', method: 'POST' });
    expect(req.request.body).toEqual({ type: 'HOUR', quantity: 1, collectNow: false, paymentMethod: null, targetRoomId: null });
    req.flush(first);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  afterEach(() => httpMock.verify());

  it('mở dialog thì xem trước thêm 1 giờ, hiện đơn kế tiếp và giới hạn giữ phòng', async () => {
    const { fixture } = await open();
    const text = document.body.textContent ?? '';

    expect(text).toContain('SH-1044');
    expect(text).toContain('chỉ gia hạn được đến 13:00 · 08/10');
    expect(text).toContain('Xác nhận gia hạn đến 13:00 · 08/10');
    expect(fixture.componentInstance['noticeBy']()).toBe('11:00 · 08/10');
  });

  it('đổi sang thêm ngày bị trùng đơn sau: khoá nút, gợi ý đổi sang thêm giờ tối đa', async () => {
    const { component, fixture } = await open();

    component.setType('DAY');
    const req = httpMock.expectOne('/api/orders/29/extend/preview');
    expect(req.request.body.type).toBe('DAY');
    req.flush(preview({ newCheckOutAt: '2026-10-09T12:00:00', fee: 650000, available: false }));
    fixture.detectChanges();

    expect(component['suggestHours']()).toBe(1);
    expect(document.body.textContent).toContain('Đổi sang thêm 1 giờ');
    component.confirm();
    httpMock.expectNone('/api/orders/29/extend');

    component.useSuggestedHours();
    const back = httpMock.expectOne('/api/orders/29/extend/preview');
    expect(back.request.body).toEqual({ type: 'HOUR', quantity: 1, collectNow: false, paymentMethod: null, targetRoomId: null });
    back.flush(preview());
  });

  it('trùng đơn sau nhưng có phòng cùng giá: chọn sẵn phòng đầu, gửi phòng chuyển sang khi xác nhận', async () => {
    const options = [
      { roomId: 7, roomNumber: '202', roomName: 'Gió', maxGuests: 2, freeUntil: '2026-10-09T19:00:00' },
      { roomId: 8, roomNumber: '203', roomName: 'Mây', maxGuests: 2, freeUntil: null },
    ];
    const { component, fixture } = await open(preview({
      newCheckOutAt: '2026-10-09T12:00:00', fee: 650000, available: false, maxExtraHours: 0, moveOptions: options,
    }));

    expect(component['targetRoomId']()).toBe(7);
    expect(component['confirmLabel']()).toBe('Chuyển sang 202 & gia hạn đến 12:00 · 09/10');
    expect(document.body.textContent).toContain('trống từ 12:00 · 08/10 đến 19:00 · 09/10');
    expect(document.body.textContent).toContain('sau đó phòng 202');

    component['targetRoomId'].set(8);
    fixture.detectChanges();
    component.confirm();
    const req = httpMock.expectOne({ url: '/api/orders/29/extend', method: 'POST' });
    expect(req.request.body.targetRoomId).toBe(8);
    req.flush(order);
  });

  it('không có phòng cùng giá và không còn giờ thêm: báo không có phòng phù hợp, khoá nút', async () => {
    const { component } = await open(preview({ available: false, maxExtraHours: 0 }));

    expect(document.body.textContent).toContain('Không có phòng phù hợp');
    expect(component['canConfirm']()).toBe(false);
    expect(component['suggestHours']()).toBeNull();
    expect(component['confirmLabel']()).toBe('Gia hạn');
  });

  it('tăng/giảm số giờ không dưới 1', async () => {
    const { component } = await open();

    component.step(-1);
    httpMock.expectOne('/api/orders/29/extend/preview').flush(preview());
    expect(component['quantity']()).toBe(1);
    component.step(1);
    expect(httpMock.expectOne('/api/orders/29/extend/preview').request.body.quantity).toBe(2);
  });

  it('thu ngay: gửi hình thức thu, xong thì phát đơn mới và đóng dialog', async () => {
    const { component } = await open();
    const extended = vi.fn();
    component.extended.subscribe(extended);

    component['collectNow'].set(true);
    component['paymentMethod'].set('TRANSFER');
    component.confirm();
    const req = httpMock.expectOne({ url: '/api/orders/29/extend', method: 'POST' });
    expect(req.request.body).toEqual({ type: 'HOUR', quantity: 1, collectNow: true, paymentMethod: 'TRANSFER', targetRoomId: null });
    req.flush({ ...order, checkOutAt: '2026-10-08T13:00:00' });

    expect(extended).toHaveBeenCalledWith(expect.objectContaining({ checkOutAt: '2026-10-08T13:00:00' }));
    expect(component.visible()).toBe(false);
  });

  it('lỗi từ server hiện ra trong dialog', async () => {
    const { component } = await open();

    component.confirm();
    httpMock.expectOne('/api/orders/29/extend')
      .flush({ detail: 'Phòng chỉ giữ được đến 13:00' }, { status: 409, statusText: 'Conflict' });

    expect(component['error']()).toBe('Phòng chỉ giữ được đến 13:00');
    expect(component.visible()).toBe(true);
  });
});
