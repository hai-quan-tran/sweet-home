import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ShiftTemplateRequest, WorkShiftRequest } from './schedule.models';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ca mẫu: GET, POST, PUT, DELETE', () => {
    service.listTemplates().subscribe();
    httpMock.expectOne({ url: '/api/shift-templates', method: 'GET' }).flush([]);
    service.createTemplate({} as ShiftTemplateRequest).subscribe();
    httpMock.expectOne({ url: '/api/shift-templates', method: 'POST' }).flush({});
    service.updateTemplate(2, {} as ShiftTemplateRequest).subscribe();
    httpMock.expectOne({ url: '/api/shift-templates/2', method: 'PUT' }).flush({});
    service.deleteTemplate(2).subscribe();
    httpMock.expectOne({ url: '/api/shift-templates/2', method: 'DELETE' }).flush(null);
  });

  it('ca: GET theo khoảng ngày, POST, PUT, DELETE, sao chép tuần', () => {
    service.listShifts('2026-10-12', '2026-10-19').subscribe();
    httpMock.expectOne('/api/shifts?from=2026-10-12&to=2026-10-19').flush([]);
    service.createShift({} as WorkShiftRequest).subscribe();
    httpMock.expectOne({ url: '/api/shifts', method: 'POST' }).flush({});
    service.updateShift(9, {} as WorkShiftRequest).subscribe();
    httpMock.expectOne({ url: '/api/shifts/9', method: 'PUT' }).flush({});
    service.deleteShift(9).subscribe();
    httpMock.expectOne({ url: '/api/shifts/9', method: 'DELETE' }).flush(null);
    service.copyWeek('2026-10-12').subscribe();
    const req = httpMock.expectOne({ url: '/api/shifts/copy-week', method: 'POST' });
    expect(req.request.body).toEqual({ weekStart: '2026-10-12' });
    req.flush({ copied: 1, skipped: 0 });
  });
});
