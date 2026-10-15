import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountUpsertRequest } from './account.models';
import { AccountService } from './account.service';

describe('AccountService', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list gọi GET /api/accounts', () => {
    service.list().subscribe();
    httpMock.expectOne({ url: '/api/accounts', method: 'GET' }).flush([]);
  });

  it('get gọi GET /api/accounts/:id', () => {
    service.get(5).subscribe();
    httpMock.expectOne({ url: '/api/accounts/5', method: 'GET' }).flush({});
  });

  it('create gọi POST kèm body', () => {
    const body = {} as AccountUpsertRequest;
    service.create(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/accounts', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('update gọi PUT /api/accounts/:id', () => {
    service.update(5, {} as AccountUpsertRequest).subscribe();
    httpMock.expectOne({ url: '/api/accounts/5', method: 'PUT' }).flush({});
  });
});
