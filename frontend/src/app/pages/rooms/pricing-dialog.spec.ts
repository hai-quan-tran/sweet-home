import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PricingOverview } from '../../core/room.models';
import { PricingDialog } from './pricing-dialog';

const overview: PricingOverview = {
  roomTypes: [{ id: 1, name: 'Tiêu chuẩn', twoHourPrice: 150000, extraHourPrice: 50000, overnightPrice: 350000, dailyPrice: 500000, roomNumbers: ['101'] }],
  hiddenRoomTypes: [{ id: 2, name: 'Gác mái', twoHourPrice: 1, extraHourPrice: 1, overnightPrice: 1, dailyPrice: 1, roomNumbers: [] }],
  settings: { minHours: 2, overnightCheckIn: '21:00:00', overnightCheckOut: '12:00:00', dailyCheckIn: '14:00:00', dailyCheckOut: '12:00:00' },
};

@Component({
  selector: 'app-host',
  imports: [PricingDialog],
  template: `<app-pricing-dialog [overview]="overview" [visible]="visible" (visibleChange)="visible = $event" (saved)="savedCount = savedCount + 1" />`,
})
class HostComponent {
  overview: PricingOverview | null = overview;
  visible = true;
  savedCount = 0;
}

describe('PricingDialog', () => {
  let httpMock: HttpTestingController;

  async function render() {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('nạp sẵn hạng phòng hiện có vào form khi mở', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as PricingDialog;
    expect(dialog['rows'].length).toBe(1);
    expect(dialog['rows'].at(0)?.value.name).toBe('Tiêu chuẩn');
  });

  it('thêm dòng mới thì rows tăng, xoá dòng thì giảm', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as PricingDialog;

    dialog.addRow();
    expect(dialog['rows'].length).toBe(2);

    dialog.removeRow(1);
    expect(dialog['rows'].length).toBe(1);
  });

  it('nạp sẵn hạng phòng đã ẩn, khôi phục thì chuyển sang rows', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as PricingDialog;
    expect(dialog['hiddenTypes']().length).toBe(1);

    dialog.restoreType(overview.hiddenRoomTypes[0]);

    expect(dialog['hiddenTypes']().length).toBe(0);
    expect(dialog['rows'].length).toBe(2);
    expect(dialog['rows'].at(1)?.value.name).toBe('Gác mái');
  });

  it('cancel thì phát visibleChange(false) và không gọi API', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as PricingDialog;

    dialog.cancel();
    fixture.detectChanges();

    expect(fixture.componentInstance.visible).toBe(false);
    httpMock.verify();
  });

  it('save gửi đúng dữ liệu và đóng dialog khi thành công', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as PricingDialog;

    dialog.save();
    const req = httpMock.expectOne('/api/room-types/overview');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.roomTypes[0].name).toBe('Tiêu chuẩn');
    req.flush(overview);
    fixture.detectChanges();

    expect(fixture.componentInstance.visible).toBe(false);
    expect(fixture.componentInstance.savedCount).toBe(1);
  });

  it('save với dòng thiếu tên thì không gọi API', async () => {
    const fixture = await render();
    const dialog = fixture.debugElement.children[0].componentInstance as PricingDialog;
    dialog['rows'].at(0)?.patchValue({ name: '' });

    dialog.save();

    httpMock.verify();
  });
});
