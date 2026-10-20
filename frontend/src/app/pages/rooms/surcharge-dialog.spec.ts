import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RoomTypeDto } from '../../core/room.models';
import { SurchargeDto } from '../../core/surcharge.models';
import { REQUIRED_FIELDS_MESSAGE } from '../../core/form-errors';
import { SurchargeDialog } from './surcharge-dialog';

const roomTypes: RoomTypeDto[] = [
  { id: 1, name: 'Tiêu chuẩn', twoHourPrice: 150000, extraHourPrice: 50000, overnightPrice: 350000, dailyPrice: 500000, roomNumbers: ['101'] },
  { id: 2, name: 'Ban công', twoHourPrice: 180000, extraHourPrice: 60000, overnightPrice: 420000, dailyPrice: 650000, roomNumbers: ['201'] },
];

const weekendSurcharge: SurchargeDto = {
  id: 9,
  name: 'Cuối tuần',
  whenType: 'WEEKDAY',
  amount: 10,
  graceMinutes: null,
  weekdays: ['FRIDAY', 'SATURDAY'],
  dateRanges: [],
  roomTypeIds: [1],
  roomTypeNames: ['Tiêu chuẩn'],
  active: true,
};

@Component({
  selector: 'app-host',
  imports: [SurchargeDialog],
  template: `<app-surcharge-dialog [surcharge]="surcharge" [roomTypes]="roomTypes" [visible]="visible"
    (visibleChange)="visible = $event" (saved)="savedCount = savedCount + 1" />`,
})
class HostComponent {
  surcharge: SurchargeDto | null = null;
  roomTypes = roomTypes;
  visible = true;
  savedCount = 0;
}

describe('SurchargeDialog', () => {
  let httpMock: HttpTestingController;

  async function render(surcharge: SurchargeDto | null = null) {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.surcharge = surcharge;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('thêm mới: mặc định whenType WEEKDAY và chọn sẵn mọi hạng phòng', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    expect(dialog['form'].value.whenType).toBe('WEEKDAY');
    expect(dialog['selectedRoomTypeIds']()).toEqual(new Set([1, 2]));
  });

  it('sửa: nạp đúng dữ liệu phụ thu hiện có', async () => {
    const fixture = await render(weekendSurcharge);
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    expect(dialog['form'].value.name).toBe('Cuối tuần');
    expect(dialog['form'].value.amount).toBe(10);
    expect(dialog['weekdays']()).toEqual(new Set(['FRIDAY', 'SATURDAY']));
    expect(dialog['selectedRoomTypeIds']()).toEqual(new Set([1]));
  });

  it('toggleWeekday thêm/xoá một ngày', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    dialog.toggleWeekday('FRIDAY');
    expect(dialog['weekdays']().has('FRIDAY')).toBe(true);
    dialog.toggleWeekday('FRIDAY');
    expect(dialog['weekdays']().has('FRIDAY')).toBe(false);
  });

  it('addDateRange/removeDateRange thêm/xoá dòng', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    dialog.addDateRange();
    expect(dialog['dateRanges'].length).toBe(1);
    dialog.removeDateRange(0);
    expect(dialog['dateRanges'].length).toBe(0);
  });

  it('save khi thiếu tên thì báo nhập đủ ô bắt buộc, không gọi API', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    dialog.save();

    expect(dialog['errorMessage']()).toBe(REQUIRED_FIELDS_MESSAGE);
    httpMock.verify();
  });

  it('save WEEKDAY mà chưa chọn ngày nào thì báo lỗi, không gọi API', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;
    dialog['form'].patchValue({ name: 'Cuối tuần', amount: 10 });

    dialog.save();

    expect(dialog['errorMessage']()).toContain('ngày trong tuần');
    httpMock.verify();
  });

  it('save thêm mới gửi đúng request rồi đóng dialog', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;
    dialog['form'].patchValue({ name: 'Cuối tuần', amount: 10 });
    dialog.toggleWeekday('FRIDAY');

    dialog.save();

    const req = httpMock.expectOne({ url: '/api/surcharges', method: 'POST' });
    expect(req.request.body).toEqual({
      name: 'Cuối tuần',
      whenType: 'WEEKDAY',
      amount: 10,
      graceMinutes: null,
      weekdays: ['FRIDAY'],
      dateRanges: null,
      roomTypeIds: [1, 2],
    });
    req.flush(weekendSurcharge);
    fixture.detectChanges();

    expect(fixture.componentInstance.visible).toBe(false);
    expect(fixture.componentInstance.savedCount).toBe(1);
  });

  it('save khi sửa gọi PUT theo id đang sửa', async () => {
    const fixture = await render(weekendSurcharge);
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    dialog.save();

    const req = httpMock.expectOne({ url: '/api/surcharges/9', method: 'PUT' });
    req.flush(weekendSurcharge);
  });

  it('hide gọi PATCH active=false rồi đóng dialog', async () => {
    const fixture = await render(weekendSurcharge);
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    dialog.hide();

    const req = httpMock.expectOne({ url: '/api/surcharges/9/active', method: 'PATCH' });
    expect(req.request.body).toEqual({ active: false });
    req.flush({ ...weekendSurcharge, active: false });
    fixture.detectChanges();

    expect(fixture.componentInstance.visible).toBe(false);
    expect(fixture.componentInstance.savedCount).toBe(1);
  });

  it('cancel phát visibleChange(false) và không gọi API', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as SurchargeDialog;

    dialog.cancel();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible).toBe(false);
    httpMock.verify();
  });
});
