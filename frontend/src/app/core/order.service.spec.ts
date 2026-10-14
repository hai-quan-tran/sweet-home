import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrderPaymentRequest, OrderPreviewRequest, OrderUpsertRequest } from './order.models';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list gọi GET /api/orders kèm query param', () => {
    service.list({ status: 'BOOKED', roomId: 5, search: 'an', page: 1, size: 10 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/orders' && r.params.get('status') === 'BOOKED' && r.params.get('roomId') === '5'
        && r.params.get('search') === 'an' && r.params.get('page') === '1' && r.params.get('size') === '10',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ items: [], total: 0, countByStatus: {} });
  });

  it('list bỏ qua các bộ lọc rỗng', () => {
    service.list({}).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/orders');
    expect(req.request.params.has('status')).toBe(false);
    expect(req.request.params.has('roomId')).toBe(false);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    req.flush({ items: [], total: 0, countByStatus: {} });
  });

  it('stays gọi GET /api/orders/stays kèm khoảng thời gian', () => {
    service.stays('2026-10-07T00:00:00', '2026-10-08T00:00:00').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/orders/stays' && r.params.get('from') === '2026-10-07T00:00:00' && r.params.get('to') === '2026-10-08T00:00:00',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('previewExtend và extend gọi POST /api/orders/:id/extend[/preview] kèm body', () => {
    const body = { type: 'HOUR' as const, quantity: 2, collectNow: false, paymentMethod: null, targetRoomId: null };
    service.previewExtend(5, body).subscribe();
    service.extend(5, body).subscribe();

    const preview = httpMock.expectOne({ url: '/api/orders/5/extend/preview', method: 'POST' });
    expect(preview.request.body).toEqual(body);
    preview.flush({});
    httpMock.expectOne({ url: '/api/orders/5/extend', method: 'POST' }).flush({});
  });

  it('get gọi GET /api/orders/:id', () => {
    service.get(5).subscribe();
    httpMock.expectOne({ url: '/api/orders/5', method: 'GET' }).flush({});
  });

  it('doorCode gọi GET /api/orders/:id/door-code', () => {
    service.doorCode(5).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/door-code', method: 'GET' }).flush({ doorCode: '123456' });
  });

  it('preview gọi POST /api/orders/preview kèm body', () => {
    const body = {} as OrderPreviewRequest;
    service.preview(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/orders/preview', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('create gọi POST /api/orders kèm body', () => {
    const body = {} as OrderUpsertRequest;
    service.create(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/orders', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });
  it('addPayment gọi POST /api/orders/:id/payments kèm body', () => {
    const body: OrderPaymentRequest = { amount: 100000, method: 'CASH', note: null };
    service.addPayment(5, body).subscribe();
    const req = httpMock.expectOne({ url: '/api/orders/5/payments', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('updatePayment gọi PUT /api/orders/:id/payments/:paymentId', () => {
    service.updatePayment(5, 7, { amount: 1, method: 'TRANSFER', note: null }).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/payments/7', method: 'PUT' }).flush({});
  });

  it('deletePayment gọi DELETE /api/orders/:id/payments/:paymentId', () => {
    service.deletePayment(5, 7).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/payments/7', method: 'DELETE' }).flush({});
  });
  it('checkIn gọi POST /api/orders/:id/check-in', () => {
    service.checkIn(5).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/check-in', method: 'POST' }).flush({});
  });
  it('previewCheckout và checkout gọi đúng URL', () => {
    const body = { actualCheckInAt: 'a', actualCheckOutAt: 'b', manualSurchargeIds: [], paymentMethod: null };
    service.previewCheckout(5, body).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/checkout/preview', method: 'POST' }).flush({});
    service.checkout(5, body).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/checkout', method: 'POST' }).flush({});
  });
  it('previewCancel và cancel gọi đúng URL', () => {
    service.previewCancel(5).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/cancel/preview', method: 'GET' }).flush({});
    service.cancel(5, { refundAmount: 0, reason: null }).subscribe();
    httpMock.expectOne({ url: '/api/orders/5/cancel', method: 'POST' }).flush({});
  });
  it('update gọi PUT /api/orders/:id kèm body', () => {
    const body = {} as OrderUpsertRequest;
    service.update(5, body).subscribe();
    const req = httpMock.expectOne({ url: '/api/orders/5', method: 'PUT' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });
});
