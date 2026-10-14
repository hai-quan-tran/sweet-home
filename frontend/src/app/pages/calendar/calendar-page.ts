import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval } from 'rxjs';

import { STATUS_TAG } from '../../core/order-labels';
import { OrderStatus, OrderStayDto } from '../../core/order.models';
import { OrderService } from '../../core/order.service';
import { RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { OrderDetail } from '../orders/order-detail';

type View = 'day' | 'week' | 'month';

const VIEWS: { value: View; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
];
const LEGEND: OrderStatus[] = ['BOOKED', 'CHECKED_IN', 'OVERSTAY', 'PENDING_CHECKOUT', 'CHECKED_OUT'];
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
/** Bề rộng tối thiểu vùng lịch theo kiểu xem, cuộn ngang khi màn hẹp hơn. */
const MIN_WIDTH: Record<View, number> = { day: 1100, week: 900, month: 1300 };

/** Một khối đơn trên lịch, vị trí tính theo % chiều ngang của khoảng đang xem. */
interface Block {
  key: string;
  orderId: number;
  guestName: string;
  label: string;
  title: string;
  cls: string;
  left: number;
  width: number;
  /** Chặng bắt đầu trước / kết thúc sau khoảng đang xem. */
  contL: boolean;
  contR: boolean;
  /** Phần quá giờ (đơn Quá giờ: từ giờ trả đến bây giờ), null nếu không có. */
  over: { left: number; width: number } | null;
}

/** Màn Lịch đặt phòng: phòng × thời gian theo ngày/tuần/tháng, bấm ô trống để tạo đơn, bấm đơn để xem chi tiết. */
@Component({
  selector: 'app-calendar-page',
  imports: [OrderDetail],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
})
export class CalendarPage {
  private readonly orderService = inject(OrderService);
  private readonly roomService = inject(RoomService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');

  protected readonly views = VIEWS;
  protected readonly legend = LEGEND;
  protected readonly statusTag = STATUS_TAG;

  protected readonly view = signal<View>('day');
  /** Ngày đang xem (0 giờ); tuần/tháng lấy theo tuần/tháng chứa ngày này. */
  protected readonly anchor = signal(startOfDay(new Date()));
  protected readonly now = signal(new Date());
  protected readonly rooms = signal<RoomDto[]>([]);
  protected readonly stays = signal<OrderStayDto[]>([]);
  protected readonly selectedId = signal<number | null>(null);

  /** Khoảng [from, to) đang xem. */
  protected readonly range = computed<[Date, Date]>(() => {
    const a = this.anchor();
    switch (this.view()) {
      case 'day':
        return [a, addDays(a, 1)];
      case 'week': {
        const monday = addDays(a, -((a.getDay() + 6) % 7));
        return [monday, addDays(monday, 7)];
      }
      case 'month':
        return [new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 1)];
    }
  });

  /** Nhãn các cột: giờ (ngày), thứ + ngày (tuần), ngày (tháng). */
  protected readonly columns = computed(() => {
    const [from, to] = this.range();
    if (this.view() === 'day') {
      return Array.from({ length: 24 }, (_, h) => pad(h));
    }
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(from, i);
      return this.view() === 'week' ? `${WEEKDAY_SHORT[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : String(d.getDate());
    });
  });

  protected readonly title = computed(() => {
    const [from, to] = this.range();
    const last = addDays(to, -1);
    switch (this.view()) {
      case 'day':
        return `${WEEKDAY_LONG[from.getDay()]}, ${dayMonth(from)}/${from.getFullYear()}`;
      case 'week':
        return `${dayMonth(from)} – ${dayMonth(last)}/${last.getFullYear()}`;
      case 'month':
        return `Tháng ${from.getMonth() + 1}/${from.getFullYear()}`;
    }
  });

  protected readonly minWidth = computed(() => MIN_WIDTH[this.view()]);

  /** Mỗi phòng một dòng, kèm các khối đơn của phòng đó. */
  protected readonly rows = computed(() => {
    const [from, to] = this.range();
    const now = this.now().getTime();
    const stays = this.stays();
    return this.rooms().map((room) => ({
      room,
      blocks: stays.filter((s) => s.roomId === room.id).map((s) => toBlock(s, from.getTime(), to.getTime(), now)),
    }));
  });

  /** Vị trí vạch "bây giờ" theo %, null khi bây giờ nằm ngoài khoảng đang xem. */
  protected readonly nowPercent = computed(() => {
    const [from, to] = this.range();
    const t = this.now().getTime();
    return t >= from.getTime() && t < to.getTime() ? ((t - from.getTime()) / (to.getTime() - from.getTime())) * 100 : null;
  });
  protected readonly nowLabel = computed(() => `${pad(this.now().getHours())}:${pad(this.now().getMinutes())}`);

  constructor() {
    this.roomService.list().subscribe((rooms) => this.rooms.set(rooms));
    effect(() => {
      this.range();
      untracked(() => {
        this.load();
        afterNextRender(() => this.scrollToNow(), { injector: this.injector });
      });
    });
    // Trạng thái đơn tự chuyển theo giờ ở backend: cập nhật vạch bây giờ và tải lại lịch mỗi phút.
    interval(60_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.now.set(new Date());
        this.load();
      });
  }

  /** Tải các chặng trong khoảng đang xem. */
  load(): void {
    const [from, to] = this.range();
    this.orderService.stays(toIsoLocal(from), toIsoLocal(to)).subscribe((stays) => this.stays.set(stays));
  }

  /** Cuộn ngang vùng lịch để vạch "bây giờ" nằm giữa (khi màn hẹp hơn lịch). */
  private scrollToNow(): void {
    const wrap = this.wrap()?.nativeElement;
    const percent = this.nowPercent();
    if (!wrap || percent === null) {
      return;
    }
    const x = 168 + ((wrap.scrollWidth - 168) * percent) / 100;
    wrap.scrollLeft = x - wrap.clientWidth / 2;
  }

  /** Đổi kiểu xem ngày/tuần/tháng. */
  setView(view: View): void {
    this.view.set(view);
  }

  /** Lùi/tiến 1 ngày, 1 tuần hoặc 1 tháng. */
  shift(step: number): void {
    const a = this.anchor();
    switch (this.view()) {
      case 'day':
        this.anchor.set(addDays(a, step));
        break;
      case 'week':
        this.anchor.set(addDays(a, step * 7));
        break;
      case 'month':
        this.anchor.set(new Date(a.getFullYear(), a.getMonth() + step, 1));
        break;
    }
  }

  /** Về hôm nay. */
  goToday(): void {
    this.anchor.set(startOfDay(new Date()));
  }

  /** Bấm một đơn: mở chi tiết, bấm lại đơn đang mở thì đóng. */
  select(orderId: number): void {
    this.selectedId.set(this.selectedId() === orderId ? null : orderId);
  }

  /**
   * Bấm ô trống của một phòng: mở Tạo đơn điền sẵn phòng + ngày (xem theo ngày thì thêm giờ tròn
   * tại vị trí bấm). Phòng tắt nhận đặt thì bỏ qua.
   */
  createAt(room: RoomDto, event: MouseEvent): void {
    if (!room.acceptingBookings) {
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const [from, to] = this.range();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 0.9999);
    const at = new Date(from.getTime() + ratio * (to.getTime() - from.getTime()));
    const queryParams: Record<string, string | number> = {
      roomId: room.id,
      date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    };
    if (this.view() === 'day') {
      queryParams['time'] = `${pad(at.getHours())}:00`;
    }
    this.router.navigate(['/don-thue/tao-moi'], { queryParams });
  }
}

/** Dựng khối hiển thị cho một chặng trong khoảng [from, to) (mili giây). */
function toBlock(s: OrderStayDto, from: number, to: number, now: number): Block {
  const start = new Date(s.startAt);
  const end = new Date(s.endAt);
  const span = to - from;
  const visibleStart = Math.max(start.getTime(), from);
  const visibleEnd = Math.min(end.getTime(), to);
  const overEnd = s.status === 'OVERSTAY' ? Math.min(now, to) : 0;
  const overStart = Math.max(end.getTime(), from);
  const label = sameDay(start, end) ? `${hm(start)} – ${hm(end)}` : `${hm(start)} ${dayMonth(start)} → ${hm(end)} ${dayMonth(end)}`;
  return {
    key: `${s.orderId}-${s.startAt}`,
    orderId: s.orderId,
    guestName: s.guestName,
    label,
    title: `${s.code} · ${s.guestName} · ${label}`,
    cls: STATUS_TAG[s.status].cls,
    left: ((visibleStart - from) / span) * 100,
    width: ((visibleEnd - visibleStart) / span) * 100,
    contL: start.getTime() < from,
    contR: end.getTime() > to,
    over: overEnd > overStart ? { left: ((overStart - from) / span) * 100, width: ((overEnd - overStart) / span) * 100 } : null,
  };
}

/** Số 2 chữ số, ví dụ 7 → "07". */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Giờ:phút, ví dụ "14:05". */
function hm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ngày/tháng, ví dụ "07/10". */
function dayMonth(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Hai thời điểm cùng ngày lịch. */
function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** 0 giờ của ngày chứa d. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 0 giờ của ngày cách ngày chứa d một số ngày. */
function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Giờ máy dạng "2026-10-07T00:00:00" (không múi giờ) để gửi backend. */
function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hm(d)}:00`;
}
