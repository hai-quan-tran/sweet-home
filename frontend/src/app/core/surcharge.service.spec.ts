import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SurchargeUpsertRequest } from './surcharge.models';
import { SurchargeService } from './surcharge.service';

describe('SurchargeService', () => {
  let service: SurchargeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SurchargeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list gọi GET /api/surcharges', () => {
    service.list().subscribe();
    httpMock.expectOne({ url: '/api/surcharges', method: 'GET' }).flush([]);
  });

  it('create gọi POST /api/surcharges kèm body', () => {
    const body = {} as SurchargeUpsertRequest;
    service.create(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/surcharges', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('update gọi PUT /api/surcharges/:id', () => {
    service.update(5, {} as SurchargeUpsertRequest).subscribe();
    httpMock.expectOne({ url: '/api/surcharges/5', method: 'PUT' }).flush({});
  });

  it('setActive gọi PATCH kèm cờ mới', () => {
    service.setActive(5, false).subscribe();
    const req = httpMock.expectOne({ url: '/api/surcharges/5/active', method: 'PATCH' });
    expect(req.request.body).toEqual({ active: false });
    req.flush({});
  });
});
