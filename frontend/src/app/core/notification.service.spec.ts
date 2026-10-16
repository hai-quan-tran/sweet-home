import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationItem } from './notification.models';
import { NotificationService, describeNotification } from './notification.service';

const NOW = '2026-10-07T12:40:00';
const base: NotificationItem = { kind: 'OVERSTAY', orderId: 11, orderCode: 'SH-1011', roomNumber: '202', guestName: 'Bùi Thanh Tâm', at: '2026-10-07T12:15:00' };

describe('NotificationService', () => {
  it('list gọi GET /api/notifications', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(NotificationService).list().subscribe();
    httpMock.expectOne('/api/notifications').flush({ now: NOW, items: [] });
    httpMock.verify();
  });

  it('quá giờ: tiêu đề có thời gian quá, nút Trả phòng + Gia hạn', () => {
    const v = describeNotification(base, NOW);
    expect(v.title).toBe('Phòng 202 quá giờ 25 phút');
    expect(v.actions.map((a) => a.queryParams['action'])).toEqual(['checkout', 'extend']);
  });

  it('chờ xác nhận trả và chưa gửi mã', () => {
    expect(describeNotification({ ...base, kind: 'PENDING_CHECKOUT', roomNumber: '302', at: '2026-10-07T10:00:00' }, NOW).meta)
      .toBe('Bùi Thanh Tâm · khách tự check-out, tự chuyển lúc 10:00');
    const code = describeNotification({ ...base, kind: 'DOOR_CODE_NOT_SENT', roomNumber: '301', at: '2026-10-07T14:00:00' }, NOW);
    expect(code.meta).toBe('Bùi Thanh Tâm · nhận phòng 14:00, còn 1 giờ 20 phút');
    expect(code.actions[0].queryParams).toEqual({ id: 11, action: 'copy' });
  });

  it('không ai trực: nêu thứ/ngày, mở Lịch làm đúng ngày', () => {
    const v = describeNotification({ ...base, kind: 'UNCOVERED', roomNumber: '201', guestName: null, at: '2026-10-09T22:30:00' }, NOW);
    expect(v.title).toBe('Thiếu nhân viên trực · T6 09/10');
    expect(v.time).toBe('09/10 22:30');
    expect(v.actions[0]).toEqual({ label: 'Mở lịch làm', path: '/lich-lam', queryParams: { date: '2026-10-09' } });
  });
});
