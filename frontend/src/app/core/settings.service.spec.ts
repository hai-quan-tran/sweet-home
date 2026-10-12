import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HomestayInfoUpdateRequest, MessageTemplateUpsertRequest } from './settings.models';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SettingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getHomestay gọi GET /api/settings/homestay', () => {
    service.getHomestay().subscribe();
    httpMock.expectOne({ url: '/api/settings/homestay', method: 'GET' }).flush({});
  });

  it('updateHomestay gọi PUT kèm body', () => {
    const body = {} as HomestayInfoUpdateRequest;
    service.updateHomestay(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/settings/homestay', method: 'PUT' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('listTemplates gọi GET /api/message-templates', () => {
    service.listTemplates().subscribe();
    httpMock.expectOne({ url: '/api/message-templates', method: 'GET' }).flush([]);
  });

  it('createTemplate gọi POST kèm body', () => {
    const body = {} as MessageTemplateUpsertRequest;
    service.createTemplate(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/message-templates', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('updateTemplate gọi PUT /api/message-templates/:id', () => {
    service.updateTemplate(5, {} as MessageTemplateUpsertRequest).subscribe();
    httpMock.expectOne({ url: '/api/message-templates/5', method: 'PUT' }).flush({});
  });

  it('deleteTemplate gọi DELETE /api/message-templates/:id', () => {
    service.deleteTemplate(5).subscribe();
    httpMock.expectOne({ url: '/api/message-templates/5', method: 'DELETE' }).flush(null);
  });
});
