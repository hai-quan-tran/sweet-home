import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrderPreviewRequest, OrderUpsertRequest } from './order.models';
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
});
