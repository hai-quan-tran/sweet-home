import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';

import { DashboardDto, DashboardTask, RoomCard, RoomState } from '../../core/dashboard.models';
import { DashboardService } from '../../core/dashboard.service';
import { formatMoney } from '../../core/money';
import { RENTAL_TYPE_LABEL } from '../../core/order-labels';
import { RentalType } from '../../core/order.models';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, dm, durationLabel, hm, minutesBetween, timeOf } from '../../core/time-format';
import { OrderAction } from '../orders/order-detail';

const RENTAL_TYPES: RentalType[] = ['HOURLY', 'OVERNIGHT', 'DAILY'];
const ROOM_TAG: Record<RoomState, { label: string; cls: string }> = {
  EMPTY: { label: 'Trống', cls: 't-o' },
  CLEANING: { label: 'Chờ dọn', cls: 't-w' },
  CHECKED_IN: { label: 'Đang ở', cls: 't-i' },
  OVERSTAY: { label: 'Quá giờ', cls: 't-w' },
  PENDING_CHECKOUT: { label: 'Chờ xác nhận trả', cls: 't-p' },
};

/** Số tiền rút gọn cho biểu đồ: "1,25tr", "350k", "0". */
export function shortMoney(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2).replace('.', ',')}tr`;
  }
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

/**
 * Màn Tổng quan: chỉ số hôm nay, tình trạng phòng, việc cần làm, doanh thu 7 ngày (chỉ Quản lý), cơ cấu đơn và
 * công suất tháng. Tự tải lại mỗi phút; nút xử lý nhanh mở chi tiết đơn kèm hành động.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly dashboardService = inject(DashboardService);

  protected readonly formatMoney = formatMoney;
  protected readonly roomTag = ROOM_TAG;
  protected readonly data = signal<DashboardDto | null>(null);

  /** Dòng phụ dưới tiêu đề: ngày, giờ cập nhật, người đang trong ca. */
  protected readonly subtitle = computed(() => {
    const d = this.data();
    if (!d) {
      return '';
    }
    const date = new Date(d.now);
    const shift = d.onShift.length ? d.onShift.map((s) => `${s.fullName} (${s.shiftName})`).join(', ') : 'chưa có ai';
    return `${WEEKDAY_NAMES[date.getDay()]}, ${dm(d.now)}/${d.now.slice(0, 4)} · cập nhật lúc ${hm(d.now)} · Đang trong ca: ${shift}`;
  });

  /** 4 chỉ số hôm nay (Nhân viên không có doanh thu). */
  protected readonly kpis = computed(() => {
    const d = this.data();
    if (!d) {
      return [];
    }
    const empty = d.rooms.filter((r) => r.state === 'EMPTY' && r.acceptingBookings);
    const cleaning = d.rooms.filter((r) => r.state === 'CLEANING').length;
    const staying = d.rooms.filter((r) => r.state === 'CHECKED_IN' || r.state === 'OVERSTAY');
    const overstay = staying.filter((r) => r.state === 'OVERSTAY').length;
    const list = [
      {
        icon: 'pi-th-large', label: 'Phòng trống', value: String(empty.length), unit: ` / ${d.rooms.length}`,
        sub: [empty.length ? `${empty.map((r) => r.roomNumber).join(', ')} sẵn sàng` : 'Hết phòng trống', cleaning ? `${cleaning} chờ dọn` : '']
          .filter(Boolean).join(' · '),
      },
      {
        icon: 'pi-users', label: 'Đang có khách', value: String(staying.length), unit: '',
        sub: overstay ? `${overstay} phòng quá giờ trả` : 'Không phòng nào quá giờ',
      },
      {
        icon: 'pi-sign-in', label: 'Lượt nhận phòng hôm nay', value: String(d.checkInsToday), unit: '',
        sub: `${d.checkedInToday} đã nhận · ${d.checkInsToday - d.checkedInToday} sắp tới`,
      },
    ];
    const today = d.revenue?.at(-1);
    if (today) {
      list.push({
        icon: 'pi-wallet', label: 'Doanh thu hôm nay', value: new Intl.NumberFormat('vi-VN').format(today.revenue), unit: 'đ',
        sub: `Đã thu ${formatMoney(today.paid)}`,
      });
    }
    return list;
  });

  /** Thẻ phòng kèm dòng giờ, phần trăm thời gian đã ở. */
  protected readonly rooms = computed(() => {
    const d = this.data();
    return (d?.rooms ?? []).map((r) => ({ room: r, ...this.roomView(r, d!.now) }));
  });

  /** Việc cần làm kèm nhãn, màu, mô tả và nút xử lý nhanh. */
  protected readonly tasks = computed(() => {
    const d = this.data();
    return (d?.tasks ?? []).map((t) => ({ task: t, time: timeOf(t.at, d!.now), ...this.taskView(t, d!.now) }));
  });

  /** Cột biểu đồ doanh thu 7 ngày (chiều cao theo ngày cao nhất). */
  protected readonly chart = computed(() => {
    const revenue = this.data()?.revenue;
    if (!revenue) {
      return null;
    }
    const max = Math.max(1, ...revenue.map((r) => r.revenue));
    return {
      total: revenue.reduce((s, r) => s + r.revenue, 0),
      cols: revenue.map((r, i) => ({
        value: shortMoney(r.revenue),
        height: Math.round((r.revenue * 100) / max),
        day: i === revenue.length - 1 ? 'Hôm nay' : WEEKDAY_SHORT[new Date(r.date + 'T00:00:00').getDay()],
        date: dm(r.date),
        today: i === revenue.length - 1,
      })),
    };
  });

  /** Cơ cấu đơn tháng theo loại thuê. */
  protected readonly mix = computed(() => {
    const d = this.data();
    if (!d) {
      return null;
    }
    const total = RENTAL_TYPES.reduce((s, t) => s + (d.monthOrders[t] ?? 0), 0);
    return {
      month: Number(d.now.slice(5, 7)),
      total,
      items: RENTAL_TYPES.map((t, i) => {
        const count = d.monthOrders[t] ?? 0;
        return { label: RENTAL_TYPE_LABEL[t], count, pct: total ? Math.round((count * 100) / total) : 0, cls: `c${i}` };
      }),
    };
  });

  constructor() {
    this.load();
    interval(60_000).pipe(takeUntilDestroyed()).subscribe(() => this.load());
  }

  /** Tải lại số liệu. */
  load(): void {
    this.dashboardService.overview().subscribe((d) => this.data.set(d));
  }

  /** Dòng giờ và thanh tiến độ của một phòng. */
  private roomView(r: RoomCard, now: string): { tag: string; line: string; progress: number | null } {
    const tag = ROOM_TAG[r.state].label;
    if (r.state === 'OVERSTAY') {
      return { tag: `${tag} ${durationLabel(minutesBetween(r.checkOutAt!, now))}`, line: `${timeOf(r.checkInAt!, now)} → ${timeOf(r.checkOutAt!, now)} · đang tính phụ thu`, progress: 100 };
    }
    if (r.state === 'PENDING_CHECKOUT') {
      return { tag, line: `Tự chuyển lúc ${timeOf(r.checkOutAt!, now)} · chờ xác nhận`, progress: null };
    }
    if (r.state === 'CHECKED_IN') {
      const total = minutesBetween(r.checkInAt!, r.checkOutAt!);
      const left = minutesBetween(now, r.checkOutAt!);
      const range = r.rentalType === 'HOURLY'
        ? `${timeOf(r.checkInAt!, now)} → ${timeOf(r.checkOutAt!, now)}`
        : `${RENTAL_TYPE_LABEL[r.rentalType!]} · trả ${hm(r.checkOutAt!)}, ${dm(r.checkOutAt!)}`;
      return { tag, line: `${range} · còn ${durationLabel(left)}`, progress: total > 0 ? Math.min(100, Math.round(((total - left) * 100) / total)) : 100 };
    }
    return {
      tag,
      line: r.nextCheckInAt ? `Khách tiếp theo ${timeOf(r.nextCheckInAt, now)} · ${r.nextGuestName}` : 'Chưa có khách đặt tiếp',
      progress: null,
    };
  }

  /** Nhãn, màu, mô tả và nút xử lý nhanh của một việc. */
  private taskView(t: DashboardTask, now: string): { label: string; tone: string; meta: string; warnMeta: boolean; action: { label: string; value: OrderAction } | null } {
    const staff = t.checkInMode === 'STAFF' ? (t.staffName ? `NV ${t.staffName.split(' ').at(-1)}` : 'chưa có NV trực') : 'tự nhận';
    const due = t.dueAmount > 0 ? ` · thu ${formatMoney(t.dueAmount)}` : '';
    switch (t.kind) {
      case 'CONFIRM_CHECKOUT':
        return { label: 'Xác nhận trả phòng', tone: 'p', meta: `P${t.roomNumber} · khách tự trả${due}`, warnMeta: false, action: { label: 'Xác nhận', value: 'checkout' } };
      case 'OVERSTAY':
        return { label: `Trả phòng · quá ${durationLabel(minutesBetween(t.at, now))}`, tone: 'w', meta: `P${t.roomNumber}${due}`, warnMeta: false, action: { label: 'Trả phòng', value: 'checkout' } };
      case 'CHECK_OUT':
        return { label: 'Trả phòng', tone: 'out', meta: `P${t.roomNumber} · ${staff}${due}`, warnMeta: false, action: null };
      default: {
        const notSent = t.doorCodeSent === false;
        return {
          label: 'Nhận phòng', tone: '',
          meta: `P${t.roomNumber} · ${staff}${t.doorCodeSent === null ? '' : notSent ? ' · chưa gửi mã' : ' · đã gửi mã'}`,
          warnMeta: notSent || (t.checkInMode === 'STAFF' && !t.staffName),
          action: notSent ? { label: 'Gửi mã', value: 'copy' } : null,
        };
      }
    }
  }
}
