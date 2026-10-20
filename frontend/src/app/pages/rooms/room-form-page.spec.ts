import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { RoomFormPage } from './room-form-page';

describe('RoomFormPage', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  const overview = {
    roomTypes: [
      { id: 1, name: 'Tiêu chuẩn', twoHourPrice: 150000, extraHourPrice: 50000, overnightPrice: 350000, dailyPrice: 500000, roomNumbers: [] },
      { id: 2, name: 'Ban công', twoHourPrice: 180000, extraHourPrice: 60000, overnightPrice: 420000, dailyPrice: 650000, roomNumbers: [] },
    ],
    hiddenRoomTypes: [],
    settings: { minHours: 2, overnightCheckIn: '21:00:00', overnightCheckOut: '12:00:00', dailyCheckIn: '14:00:00', dailyCheckOut: '12:00:00' },
  };

  async function createForAdd(pricing = overview) {
    await TestBed.configureTestingModule({
      imports: [RoomFormPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(RoomFormPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/room-types/overview').flush(pricing);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('đổi hạng phòng thì selectedRoomType cập nhật ngay (không bị đứng giá trị cũ)', async () => {
    const fixture = await createForAdd();
    const component = fixture.componentInstance;

    expect(component['selectedRoomType']()).toBeNull();

    component['form'].controls.roomTypeId.setValue(2);
    fixture.detectChanges();

    expect(component['selectedRoomType']()?.name).toBe('Ban công');

    component['form'].controls.roomTypeId.setValue(1);
    fixture.detectChanges();

    expect(component['selectedRoomType']()?.name).toBe('Tiêu chuẩn');
  });

  it('nhãn giá giờ đầu theo số giờ tối thiểu của bảng giá', async () => {
    const fixture = await createForAdd({ ...overview, settings: { ...overview.settings, minHours: 3 } });
    fixture.componentInstance['form'].controls.roomTypeId.setValue(1);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.prices4 .pr span')?.textContent).toBe('3 giờ đầu');
  });

  it('không gửi request khi thiếu trường bắt buộc', async () => {
    const fixture = await createForAdd();
    fixture.componentInstance.submit();
    httpMock.verify();
  });

  it('chọn giá riêng nhưng thiếu giá thì báo lỗi, không gửi request', async () => {
    const fixture = await createForAdd();
    const component = fixture.componentInstance;
    component['form'].setValue({
      roomNumber: '101',
      name: 'Mộc',
      floor: 1,
      roomTypeId: 1,
      maxGuests: 2,
      bedConfig: '',
      description: '',
      pricingMode: 'OWN',
      ownTwoHourPrice: 100000,
      ownExtraHourPrice: null,
      ownOvernightPrice: null,
      ownDailyPrice: null,
      defaultCheckInMode: 'SELF',
      checkInGuide: '',
      acceptingBookings: true,
    });

    component.submit();

    expect(component['errorMessage']()).toContain('giá riêng');
    httpMock.verify();
  });

  it('điền đủ dữ liệu thì tạo phòng thành công và chuyển về /phong', async () => {
    const fixture = await createForAdd();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const component = fixture.componentInstance;
    component['form'].setValue({
      roomNumber: '101',
      name: 'Mộc',
      floor: 1,
      roomTypeId: 1,
      maxGuests: 2,
      bedConfig: '',
      description: '',
      pricingMode: 'ROOM_TYPE',
      ownTwoHourPrice: null,
      ownExtraHourPrice: null,
      ownOvernightPrice: null,
      ownDailyPrice: null,
      defaultCheckInMode: 'SELF',
      checkInGuide: '',
      acceptingBookings: true,
    });

    component.submit();
    const req = httpMock.expectOne({ url: '/api/rooms', method: 'POST' });
    req.flush({ id: 10, roomNumber: '101', photos: [] });

    expect(navigateSpy).toHaveBeenCalledWith('/phong');
  });

  /** Giá trị form hợp lệ tối thiểu. */
  const validForm = {
    roomNumber: '101', name: 'Mộc', floor: 1, roomTypeId: 1, maxGuests: 2, bedConfig: '', description: '',
    pricingMode: 'ROOM_TYPE' as const, ownTwoHourPrice: null, ownExtraHourPrice: null, ownOvernightPrice: null, ownDailyPrice: null,
    defaultCheckInMode: 'SELF' as const, checkInGuide: '', acceptingBookings: true,
  };
  const photo = { id: 3, url: '/api/room-photos/3', cover: true };

  /** Sự kiện chọn file của ô input. */
  function fileEvent(files: File[]): Event {
    return { target: { files, value: 'x' } } as unknown as Event;
  }

  it('thêm phòng: ảnh chọn được xem trước, bỏ được, lưu phòng xong mới tải ảnh lên rồi về /phong', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    const fixture = await createForAdd();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const component = fixture.componentInstance;
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' });

    component.onFilesSelected(fileEvent([]));
    component.onFilesSelected(fileEvent([a, b]));
    component.removePendingPhoto(0);
    expect(component['pendingPhotos']().map((p) => p.file)).toEqual([b]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');

    component['form'].setValue(validForm);
    component.submit();
    httpMock.expectOne({ url: '/api/rooms', method: 'POST' }).flush({ id: 10, photos: [] });
    httpMock.expectOne({ url: '/api/rooms/10/photos', method: 'POST' }).flush({ id: 10, photos: [photo] });
    expect(navigateSpy).toHaveBeenCalledWith('/phong');
  });

  it('lưu lỗi thì hiện lý do từ server', async () => {
    const fixture = await createForAdd();
    fixture.componentInstance['form'].setValue(validForm);

    fixture.componentInstance.submit();
    httpMock.expectOne({ url: '/api/rooms', method: 'POST' }).flush({ detail: 'Số phòng đã tồn tại' }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance['errorMessage']()).toBe('Số phòng đã tồn tại');
    expect(fixture.componentInstance['submitting']()).toBe(false);
  });

  it('chế độ sửa: chọn ảnh thì tải lên ngay, xoá ảnh đã lưu, lưu thì PUT', async () => {
    await TestBed.configureTestingModule({
      imports: [RoomFormPage],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RoomFormPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne('/api/room-types/overview').flush(overview);
    httpMock.expectOne('/api/rooms/7').flush({ id: 7, ...validForm, roomTypeName: 'Tiêu chuẩn', bedConfig: null, description: null, checkInGuide: null, photos: [] });

    component.onFilesSelected(fileEvent([new File(['a'], 'a.png', { type: 'image/png' })]));
    httpMock.expectOne({ url: '/api/rooms/7/photos', method: 'POST' }).flush({ photos: [photo] });
    expect(component['existingPhotos']()).toEqual([photo]);

    component.removeExistingPhoto(photo);
    httpMock.expectOne({ url: '/api/rooms/7/photos/3', method: 'DELETE' }).flush({ photos: [] });
    expect(component['existingPhotos']()).toEqual([]);

    component.submit();
    expect(httpMock.expectOne({ url: '/api/rooms/7', method: 'PUT' }).request.body.bedConfig).toBeNull();
  });

  it('chế độ sửa: nạp sẵn dữ liệu phòng từ API theo id trên route', async () => {
    await TestBed.configureTestingModule({
      imports: [RoomFormPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(RoomFormPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/room-types/overview').flush(overview);
    httpMock.expectOne('/api/rooms/7').flush({
      id: 7, roomNumber: '101', name: 'Mộc', floor: 1, roomTypeId: 1, roomTypeName: 'Tiêu chuẩn',
      maxGuests: 2, bedConfig: null, description: null, pricingMode: 'ROOM_TYPE',
      ownTwoHourPrice: null, ownExtraHourPrice: null, ownOvernightPrice: null, ownDailyPrice: null,
      effectiveTwoHourPrice: 150000, effectiveExtraHourPrice: 50000, effectiveOvernightPrice: 350000, effectiveDailyPrice: 500000,
      defaultCheckInMode: 'SELF', checkInGuide: null, acceptingBookings: true, photos: [],
    });
    fixture.detectChanges();

    expect(fixture.componentInstance['isEdit']()).toBe(true);
    expect(fixture.componentInstance['form'].controls.roomNumber.value).toBe('101');
  });
});
