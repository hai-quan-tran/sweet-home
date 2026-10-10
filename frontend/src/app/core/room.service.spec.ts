import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PricingOverviewUpdateRequest, RoomUpsertRequest } from './room.models';
import { RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RoomService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('pricingOverview gọi GET /api/room-types/overview', () => {
    service.pricingOverview().subscribe();
    const req = httpMock.expectOne('/api/room-types/overview');
    expect(req.request.method).toBe('GET');
    req.flush({ roomTypes: [], hiddenRoomTypes: [], settings: {} });
  });

  it('savePricingOverview gọi PUT kèm body', () => {
    const body: PricingOverviewUpdateRequest = {
      roomTypes: [{ id: null, name: 'A', twoHourPrice: 1, extraHourPrice: 1, overnightPrice: 1, dailyPrice: 1 }],
      settings: { minHours: 2, overnightCheckIn: '21:00', overnightCheckOut: '12:00', dailyCheckIn: '14:00', dailyCheckOut: '12:00' },
    };
    service.savePricingOverview(body).subscribe();
    const req = httpMock.expectOne('/api/room-types/overview');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ roomTypes: [], hiddenRoomTypes: [], settings: {} });
  });

  it('list gọi GET /api/rooms', () => {
    service.list().subscribe();
    httpMock.expectOne({ url: '/api/rooms', method: 'GET' }).flush([]);
  });

  it('get gọi GET /api/rooms/:id', () => {
    service.get(5).subscribe();
    httpMock.expectOne({ url: '/api/rooms/5', method: 'GET' }).flush({});
  });

  it('create gọi POST /api/rooms kèm body', () => {
    const body = {} as RoomUpsertRequest;
    service.create(body).subscribe();
    const req = httpMock.expectOne({ url: '/api/rooms', method: 'POST' });
    expect(req.request.body).toBe(body);
    req.flush({});
  });

  it('update gọi PUT /api/rooms/:id', () => {
    service.update(5, {} as RoomUpsertRequest).subscribe();
    httpMock.expectOne({ url: '/api/rooms/5', method: 'PUT' }).flush({});
  });

  it('setAcceptingBookings gọi PATCH kèm cờ mới', () => {
    service.setAcceptingBookings(5, false).subscribe();
    const req = httpMock.expectOne({ url: '/api/rooms/5/accepting-bookings', method: 'PATCH' });
    expect(req.request.body).toEqual({ acceptingBookings: false });
    req.flush({});
  });

  it('addPhotos gửi FormData với field "files"', () => {
    const file = new File(['a'], 'a.png', { type: 'image/png' });
    service.addPhotos(5, [file]).subscribe();
    const req = httpMock.expectOne({ url: '/api/rooms/5/photos', method: 'POST' });
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).getAll('files')).toEqual([file]);
    req.flush({});
  });

  it('deletePhoto gọi DELETE /api/rooms/:id/photos/:photoId', () => {
    service.deletePhoto(5, 9).subscribe();
    httpMock.expectOne({ url: '/api/rooms/5/photos/9', method: 'DELETE' }).flush({});
  });
});
