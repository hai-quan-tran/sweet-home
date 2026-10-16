import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { NotificationDto, NotificationItem } from './notification.models';
import { WEEKDAY_SHORT, dm, durationLabel, hm, minutesBetween, timeOf } from './time-format';

/** Nút xử lý nhanh: link tới màn và query param (vd mở chi tiết đơn kèm hành động). */
export interface NotificationAction {
  label: string;
  path: string;
  queryParams: Record<string, string | number>;
}

/** Nội dung hiển thị một thông báo. */
export interface NotificationView {
  tone: 'w' | 'p' | 'c';
  icon: string;
  title: string;
  meta: string;
  time: string;
  actions: NotificationAction[];
}

/** Dựng nội dung hiển thị (tiêu đề, mô tả, nút xử lý nhanh) cho một thông báo tại thời điểm `now`. */
export function describeNotification(n: NotificationItem, now: string): NotificationView {
  const order = (label: string, action: string): NotificationAction => ({ label, path: '/don-thue', queryParams: { id: n.orderId, action } });
  switch (n.kind) {
    case 'OVERSTAY':
      return {
        tone: 'w', icon: 'pi-clock', title: `Phòng ${n.roomNumber} quá giờ ${durationLabel(minutesBetween(n.at, now))}`,
        meta: `${n.guestName} · hẹn trả ${timeOf(n.at, now)}`, time: timeOf(n.at, now),
        actions: [order('Trả phòng', 'checkout'), order('Gia hạn', 'extend')],
      };
    case 'PENDING_CHECKOUT':
      return {
        tone: 'p', icon: 'pi-check-circle', title: `Chờ xác nhận trả · P${n.roomNumber}`,
        meta: `${n.guestName} · khách tự check-out, tự chuyển lúc ${timeOf(n.at, now)}`, time: timeOf(n.at, now),
        actions: [order('Xác nhận trả phòng', 'checkout')],
      };
    case 'DOOR_CODE_NOT_SENT':
      return {
        tone: 'w', icon: 'pi-key', title: `Chưa gửi mã cửa · P${n.roomNumber}`,
        meta: `${n.guestName} · nhận phòng ${hm(n.at)}, còn ${durationLabel(minutesBetween(now, n.at))}`, time: hm(n.at),
        actions: [order('Sao chép tin nhắn', 'copy')],
      };
    default:
      return {
        tone: 'c', icon: 'pi-user-minus', title: `Thiếu nhân viên trực · ${WEEKDAY_SHORT[new Date(n.at).getDay()]} ${dm(n.at)}`,
        meta: `${n.orderCode} (P${n.roomNumber}) nhận phòng ${hm(n.at)} cần nhân viên đón, chưa ai trực lúc đó`, time: timeOf(n.at, now),
        actions: [{ label: 'Mở lịch làm', path: '/lich-lam', queryParams: { date: n.at.slice(0, 10) } }],
      };
  }
}

/** Gọi API thông báo trên chuông. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);

  /** Thông báo hiện tại ("không ai trực" chỉ có với Quản lý). */
  list(): Observable<NotificationDto> {
    return this.http.get<NotificationDto>('/api/notifications');
  }
}
