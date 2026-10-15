import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivityLogService, periodStart } from './activity-log.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ActivityLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search gửi from, page và actor nếu có', () => {
    service.search('today', 'hong', 2).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/activity-logs');
    expect(req.request.params.get('from')).toBe(periodStart('today'));
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('actor')).toBe('hong');
    req.flush({ items: [], total: 0 });
  });

  it('search không gửi actor khi lọc mọi người', () => {
    service.search('week', null, 0).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/activity-logs');
    expect(req.request.params.has('actor')).toBe(false);
    req.flush({ items: [], total: 0 });
  });

  it('periodStart: hôm nay, 7 ngày gồm hôm nay, đầu tháng', () => {
    const now = new Date(2026, 9, 3, 15, 30);
    expect(periodStart('today', now)).toBe('2026-10-03T00:00:00');
    expect(periodStart('week', now)).toBe('2026-09-27T00:00:00');
    expect(periodStart('month', now)).toBe('2026-10-01T00:00:00');
  });
});
