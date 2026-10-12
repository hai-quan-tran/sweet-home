import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { formatMoney } from '../../core/money';
import { buildOrderMessageContext, renderMessageTemplate } from '../../core/message-template';
import { OrderDto, OrderListResponse, OrderStatus } from '../../core/order.models';
import { OrderListQuery, OrderService } from '../../core/order.service';
import { RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { HomestayInfoDto, MessageTemplateDto } from '../../core/settings.models';
import { SettingsService } from '../../core/settings.service';

const STATUS_TABS: { value: OrderStatus | null; label: string }[] = [
  { value: null, label: 'Tất cả' },
  { value: 'BOOKED', label: 'Đã đặt' },
  { value: 'CHECKED_IN', label: 'Đang ở' },
  { value: 'OVERSTAY', label: 'Quá giờ' },
  { value: 'PENDING_CHECKOUT', label: 'Chờ xác nhận' },
  { value: 'CHECKED_OUT', label: 'Đã trả' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

const STATUS_TAG: Record<OrderStatus, { label: string; cls: string }> = {
  BOOKED: { label: 'Đã đặt', cls: 't-b' },
  CHECKED_IN: { label: 'Đang ở', cls: 't-i' },
  OVERSTAY: { label: 'Quá giờ', cls: 't-w' },
  PENDING_CHECKOUT: { label: 'Chờ xác nhận', cls: 't-p' },
  CHECKED_OUT: { label: 'Đã trả', cls: 't-o' },
  CANCELLED: { label: 'Đã huỷ', cls: 't-c' },
};

const RENTAL_TYPE_LABEL: Record<OrderDto['rentalType'], string> = { HOURLY: 'Theo giờ', OVERNIGHT: 'Qua đêm', DAILY: 'Theo ngày' };
const CHECK_IN_MODE_LABEL: Record<OrderDto['checkInMode'], string> = { SELF: 'tự nhận', STAFF: 'NV đón' };
const SOURCE_LABEL: Record<OrderDto['source'], string> = {
  ZALO: 'Zalo', FACEBOOK: 'Facebook', PHONE: 'Gọi điện', REGULAR: 'Khách quen', OTHER: 'Khác',
};
const PAGE_SIZE = 10;

/** Màn Đơn thuê: danh sách lọc/tìm kiếm theo trạng thái + chi tiết đơn đang chọn (chỉ xem, GĐ4). */
@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, ButtonModule, FormsModule],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage {
  private readonly orderService = inject(OrderService);
  private readonly roomService = inject(RoomService);
  private readonly settingsService = inject(SettingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatMoney = formatMoney;
  protected readonly Math = Math;
  protected readonly statusTabs = STATUS_TABS;
  protected readonly statusTag = STATUS_TAG;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly checkInModeLabel = CHECK_IN_MODE_LABEL;
  protected readonly sourceLabel = SOURCE_LABEL;

  protected readonly statusFilter = signal<OrderStatus | null>(null);
  protected readonly roomFilter = signal<number | null>(null);
  protected readonly search = signal('');
  protected readonly page = signal(0);
  protected readonly loading = signal(true);
  protected readonly listResponse = signal<OrderListResponse | null>(null);
  protected readonly rooms = signal<RoomDto[]>([]);

  protected readonly selectedOrder = signal<OrderDto | null>(null);
  protected readonly selectedRoomGuide = signal<string | null>(null);
  protected readonly doorCode = signal<string | null>(null);
  protected readonly revealingDoorCode = signal(false);

  protected readonly templates = signal<MessageTemplateDto[]>([]);
  protected readonly homestay = signal<HomestayInfoDto | null>(null);
  protected readonly selectedTemplateId = signal<number | null>(null);
  protected readonly copyFeedback = signal<string | null>(null);

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil((this.listResponse()?.total ?? 0) / PAGE_SIZE)));
  protected readonly selectedTemplate = computed(() => this.templates().find((t) => t.id === this.selectedTemplateId()) ?? null);

  constructor() {
    this.roomService.list().subscribe((rooms) => this.rooms.set(rooms));
    this.settingsService.listTemplates().subscribe((list) => this.templates.set(list));
    this.settingsService.getHomestay().subscribe((info) => this.homestay.set(info));
    this.reload();

    const idParam = this.route.snapshot.queryParamMap.get('id');
    const copyParam = this.route.snapshot.queryParamMap.get('copy');
    if (idParam) {
      this.openOrder(Number(idParam), copyParam === '1');
    }
  }

  private reload(): void {
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
    this.router.navigate([], { relativeTo: this.route, queryParams: { id: order.id }, queryParamsHandling: 'merge' });
    this.openOrder(order.id, false);
  }

  private openOrder(id: number, autoCopy: boolean): void {
    this.doorCode.set(null);
    this.copyFeedback.set(null);
    this.orderService.get(id).subscribe((order) => {
      this.selectedOrder.set(order);
      this.selectedTemplateId.set(this.templates().find((t) => t.defaultForCheckInMode === order.checkInMode)?.id ?? this.templates()[0]?.id ?? null);
      this.roomService.get(order.roomId).subscribe((room) => this.selectedRoomGuide.set(room.checkInGuide));
      if (autoCopy) {
        this.copyMessage();
      }
    });
  }

  /** Hiện mã cửa của đơn đang chọn. */
  revealDoorCode(): void {
    const order = this.selectedOrder();
    if (!order || this.revealingDoorCode()) {
      return;
    }
    this.revealingDoorCode.set(true);
    this.orderService.doorCode(order.id).subscribe((res) => {
      this.doorCode.set(res.doorCode);
      this.revealingDoorCode.set(false);
    });
  }

  /** Sao chép tin nhắn theo mẫu đang chọn vào clipboard (tự lấy mã cửa nếu mẫu cần). */
  copyMessage(): void {
    const order = this.selectedOrder();
    const template = this.selectedTemplate();
    const homestay = this.homestay();
    if (!order || !template || !homestay) {
      return;
    }
    const render = (code: string | null) => {
      const context = buildOrderMessageContext(order, homestay, this.selectedRoomGuide(), code);
      const text = renderMessageTemplate(template.body, context);
      navigator.clipboard?.writeText(text).then(
        () => this.copyFeedback.set('Đã sao chép tin nhắn.'),
        () => this.copyFeedback.set('Không sao chép được, hãy thử lại.'),
      );
    };
    if (template.containsDoorCode && order.hasDoorCode && this.doorCode() === null) {
      this.orderService.doorCode(order.id).subscribe((res) => {
        this.doorCode.set(res.doorCode);
        render(res.doorCode);
      });
    } else {
      render(this.doorCode());
    }
  }
}
