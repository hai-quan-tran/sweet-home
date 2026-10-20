import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccountSummary } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { REQUIRED_FIELDS_MESSAGE } from '../../core/form-errors';
import { SettingsPage } from './settings-page';

const templateA = { id: 1, name: 'Hướng dẫn tự nhận phòng', body: 'Chào {ten_khach}', defaultForCheckInMode: 'SELF', containsDoorCode: false };
const templateB = { id: 2, name: 'Nhắc giờ trả phòng', body: 'Nhắc {ten_khach}', defaultForCheckInMode: null, containsDoorCode: false };
const homestay = { name: 'Sweet Home', hotline: '0909123456', address: 'Địa chỉ', mapLink: null, wifiName: null, wifiPassword: null };

describe('SettingsPage', () => {
  let httpMock: HttpTestingController;

  async function render(role: 'MANAGER' | 'STAFF' = 'MANAGER') {
    const user: AccountSummary = { id: 1, username: 'u', fullName: 'Người dùng', role, mustChangePassword: false };
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: signal(user).asReadonly() } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    httpMock.expectOne('/api/message-templates').flush([templateA, templateB]);
    httpMock.expectOne('/api/settings/homestay').flush(homestay);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('nạp danh sách mẫu và chọn sẵn mẫu đầu tiên', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    expect(component['templates']().length).toBe(2);
    expect(component['selectedId']()).toBe(1);
    expect(component['templateForm'].value.name).toBe('Hướng dẫn tự nhận phòng');
  });

  it('newTemplate xoá form và bỏ chọn', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    component.newTemplate();

    expect(component['selectedId']()).toBeNull();
    expect(component['templateForm'].value.name).toBe('');
  });

  it('lưu mẫu / thông tin homestay khi thiếu ô bắt buộc thì báo lỗi, không gọi API', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    component.newTemplate();
    component.saveTemplate();
    component['homestayForm'].patchValue({ name: '' });
    component.saveHomestay();

    expect(component['errorMessage']()).toBe(REQUIRED_FIELDS_MESSAGE);
    expect(component['homestayError']()).toBe(REQUIRED_FIELDS_MESSAGE);
  });

  it('xem trước nội dung đang gõ với đơn mẫu, mã cửa hiện dạng che', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.preview')?.textContent).toBe('Chào Phạm Quốc Bảo');

    fixture.componentInstance['templateForm'].controls.body.setValue('Mã cửa {ma_cua}\nHotline {hotline}');
    fixture.detectChanges();

    const preview = el.querySelector('.preview')!;
    expect(preview.textContent).toBe('Mã cửa ●●●●●● (hiện khi sao chép)\nHotline 0909123456');
    expect(preview.querySelector('.mask')).not.toBeNull();

    fixture.componentInstance.newTemplate();
    fixture.detectChanges();
    expect(el.querySelector('.preview')).toBeNull();
  });

  it('insertVariable chèn biến vào nội dung', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component['templateForm'].controls.body.setValue('Xin chào');

    component.insertVariable('ma_cua');

    expect(component['templateForm'].value.body).toContain('{ma_cua}');
  });

  it('saveTemplate khi đang sửa thì gọi PUT theo id đang chọn', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component['templateForm'].patchValue({ name: 'Tên mới' });

    component.saveTemplate();

    const req = httpMock.expectOne({ url: '/api/message-templates/1', method: 'PUT' });
    expect(req.request.body.name).toBe('Tên mới');
    req.flush({ ...templateA, name: 'Tên mới' });
    httpMock.expectOne('/api/message-templates').flush([{ ...templateA, name: 'Tên mới' }, templateB]);
  });

  it('saveTemplate khi thêm mới thì gọi POST', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component.newTemplate();
    component['templateForm'].setValue({ name: 'Mẫu mới', body: 'Nội dung', defaultForCheckInMode: null });

    component.saveTemplate();

    const req = httpMock.expectOne({ url: '/api/message-templates', method: 'POST' });
    req.flush({ id: 3, name: 'Mẫu mới', body: 'Nội dung', defaultForCheckInMode: null, containsDoorCode: false });
    httpMock.expectOne('/api/message-templates').flush([templateA, templateB, { id: 3, name: 'Mẫu mới', body: 'Nội dung', defaultForCheckInMode: null, containsDoorCode: false }]);
  });

  it('deleteTemplate xoá mẫu đang chọn rồi chọn mẫu còn lại', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;

    component.deleteTemplate();

    httpMock.expectOne({ url: '/api/message-templates/1', method: 'DELETE' }).flush(null);

    expect(component['templates']().map((t) => t.id)).toEqual([2]);
    expect(component['selectedId']()).toBe(2);
  });

  it('saveHomestay gọi PUT với dữ liệu form', async () => {
    const fixture = await render();
    const component = fixture.componentInstance;
    component['homestayForm'].patchValue({ hotline: '0911111111' });

    component.saveHomestay();

    const req = httpMock.expectOne({ url: '/api/settings/homestay', method: 'PUT' });
    expect(req.request.body.hotline).toBe('0911111111');
    req.flush({ ...homestay, hotline: '0911111111' });
  });
});
