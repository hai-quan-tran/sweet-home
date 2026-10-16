import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { formatMoney } from '../../core/money';
import { CHECK_IN_MODE_LABEL, RENTAL_TYPE_LABEL, STATUS_TAG } from '../../core/order-labels';
import { OrderDto, OrderListResponse, OrderStatus } from '../../core/order.models';
import { OrderListQuery, OrderService } from '../../core/order.service';
import { RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { OrderAction, OrderDetail } from './order-detail';

const STATUS_TABS: { value: OrderStatus | null; label: string }[] = [
  { value: null, label: 'Tất cả' },
  { value: 'BOOKED', label: 'Đã đặt' },
  { value: 'CHECKED_IN', label: 'Đang ở' },
  { value: 'OVERSTAY', label: 'Quá giờ' },
  { value: 'PENDING_CHECKOUT', label: 'Chờ xác nhận' },
  { value: 'CHECKED_OUT', label: 'Đã trả' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];
const PAGE_SIZE = 10;

/** Màn Đơn thuê: danh sách lọc/tìm kiếm theo trạng thái + chi tiết đơn đang chọn ({@link OrderDetail}). */
@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, OrderDetail],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly roomService = inject(RoomService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatMoney = formatMoney;
  protected readonly Math = Math;
  protected readonly statusTabs = STATUS_TABS;
  protected readonly statusTag = STATUS_TAG;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly checkInModeLabel = CHECK_IN_MODE_LABEL;

  protected readonly statusFilter = signal<OrderStatus | null>(null);
  protected readonly roomFilter = signal<number | null>(null);
  protected readonly search = signal('');
  protected readonly page = signal(0);
  protected readonly loading = signal(true);
  protected readonly listResponse = signal<OrderListResponse | null>(null);
  protected readonly rooms = signal<RoomDto[]>([]);
  /** Đơn đang mở chi tiết. */
  protected readonly selectedId = signal<number | null>(null);
  /** Hành động tự làm khi mở đơn từ URL có `action` (vừa tạo đơn, xử lý nhanh từ Tổng quan / thông báo). */
  protected readonly autoAction = signal<OrderAction | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil((this.listResponse()?.total ?? 0) / PAGE_SIZE)));

  constructor() {
    this.roomService.list().subscribe((rooms) => this.rooms.set(rooms));
    this.reload();

    // Theo dõi URL (không chỉ lúc vào màn) để bấm thông báo khi đang ở màn này vẫn mở đúng đơn.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.autoAction.set(params.get('action') as OrderAction | null);
        this.selectedId.set(Number(id));
      }
    });
  }

  /** Tải lại danh sách theo bộ lọc hiện tại. */
  reload(): void {
    this.loading.set(true);
    const query: OrderListQuery = {
      status: this.statusFilter() ?? undefined,
      roomId: this.roomFilter() ?? undefined,
      search: this.search() || undefined,
      page: this.page(),
      size: PAGE_SIZE,
    };
    this.orderService.list(query).subscribe((result) => {
      this.listResponse.set(result);
      this.loading.set(false);
    });
  }

  /** Đổi tab trạng thái. */
  setStatus(status: OrderStatus | null): void {
    this.statusFilter.set(status);
    this.page.set(0);
    this.reload();
  }

  /** Đổi bộ lọc phòng. */
  setRoomFilter(value: string): void {
    this.roomFilter.set(value ? Number(value) : null);
    this.page.set(0);
    this.reload();
  }

  /** Gõ ô tìm kiếm. */
  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
    this.reload();
  }

  /** Chuyển trang. */
  setPage(page: number): void {
    if (page < 0 || page >= this.totalPages()) {
      return;
    }
    this.page.set(page);
    this.reload();
  }

  /** Mở chi tiết một đơn, cập nhật lại URL để chia sẻ/giữ khi tải lại trang. */
  selectOrder(order: OrderDto): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { id: order.id, action: null }, queryParamsHandling: 'merge' });
    this.autoAction.set(null);
    this.selectedId.set(order.id);
  }
}
