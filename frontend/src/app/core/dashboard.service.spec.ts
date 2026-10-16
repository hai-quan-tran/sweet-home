import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('overview gọi GET /api/dashboard', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const httpMock = TestBed.inject(HttpTestingController);
    let rooms = -1;
    TestBed.inject(DashboardService).overview().subscribe((d) => (rooms = d.rooms.length));
    const req = httpMock.expectOne('/api/dashboard');
    expect(req.request.method).toBe('GET');
    req.flush({ rooms: [] });
    expect(rooms).toBe(0);
    httpMock.verify();
  });
});
