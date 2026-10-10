import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gửi request kèm withCredentials', () => {
    http.get('/api/phong').subscribe();
    const req = httpMock.expectOne('/api/phong');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('gặp 401 thì tự refresh rồi thử lại request gốc', () => {
    let result: unknown;
    http.get('/api/phong').subscribe((r) => (result = r));

    httpMock.expectOne('/api/phong').flush('hết hạn', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/auth/refresh').flush({ id: 1 });
    httpMock.expectOne('/api/phong').flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('refresh cũng thất bại thì báo lỗi cho lời gọi gốc (guard sẽ đưa về đăng nhập ở lần chuyển màn)', () => {
    let errored = false;
    http.get('/api/phong').subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/api/phong').flush('hết hạn', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/auth/refresh').flush('hết hạn', { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBe(true);
  });

  it('request tới /auth/login không tự refresh khi lỗi', () => {
    let errored = false;
    http.post('/api/auth/login', {}).subscribe({ error: () => (errored = true) });

    httpMock.expectOne('/api/auth/login').flush('sai', { status: 401, statusText: 'Unauthorized' });

    expect(errored).toBe(true);
    httpMock.verify();
  });
});
