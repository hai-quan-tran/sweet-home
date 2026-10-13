import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Observable, finalize } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/money';
import { buildOrderMessageContext, renderMessageTemplate } from '../../core/message-template';
import {
  CancelPreviewResponse,
  CheckoutPreviewResponse,
  CheckoutRequest,
  OrderDto,
  OrderListResponse,
  OrderPaymentDto,
  OrderStatus,
  PaymentMethod,
} from '../../core/order.models';
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
const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { TRANSFER: 'chuyển khoản', CASH: 'tiền mặt' };
const CLOSED_STATUSES: OrderStatus[] = ['CHECKED_OUT', 'CANCELLED'];
const STAYING_STATUSES: OrderStatus[] = ['CHECKED_IN', 'OVERSTAY', 'PENDING_CHECKOUT'];
const PAGE_SIZE = 10;

/** Màn Đơn thuê: danh sách lọc/tìm kiếm theo trạng thái + chi tiết đơn đang chọn, thu tiền. */
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
  private readonly auth = inject(AuthService);

  protected readonly formatMoney = formatMoney;
  protected readonly Math = Math;
  protected readonly statusTabs = STATUS_TABS;
  protected readonly statusTag = STATUS_TAG;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly checkInModeLabel = CHECK_IN_MODE_LABEL;
  protected readonly sourceLabel = SOURCE_LABEL;
  protected readonly paymentMethodLabel = PAYMENT_METHOD_LABEL;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');

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

  /** Form thu tiền: null = đóng, 0 = thêm mới, > 0 = id khoản thu đang sửa. */
  protected readonly paymentFormId = signal<number | null>(null);
  protected readonly paymentAmount = signal(0);
  protected readonly paymentMethod = signal<PaymentMethod>('CASH');
  protected readonly paymentNote = signal('');
  protected readonly paymentError = signal<string | null>(null);
  protected readonly savingPayment = signal(false);
  protected readonly acting = signal(false);
  protected readonly actionError = signal<string | null>(null);

  /** Form trả phòng: giờ thực tế (dạng ô datetime-local), phụ thu thêm tay, hình thức thu số còn lại. */
  protected readonly checkoutOpen = signal(false);
  protected readonly checkoutIn = signal('');
  protected readonly checkoutOut = signal('');
  protected readonly checkoutManualIds = signal<number[]>([]);
  protected readonly checkoutMethod = signal<PaymentMethod>('CASH');
  protected readonly checkoutPreview = signal<CheckoutPreviewResponse | null>(null);

  /** Form huỷ đơn: mức hoàn tự tính, số tiền hoàn (chỉ Quản lý sửa), lý do. */
  protected readonly cancelPreview = signal<CancelPreviewResponse | null>(null);
  protected readonly cancelRefund = signal(0);
  protected readonly cancelReason = signal('');

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil((this.listResponse()?.total ?? 0) / PAGE_SIZE)));
  protected readonly selectedTemplate = computed(() => this.templates().find((t) => t.id === this.selectedTemplateId()) ?? null);
  protected readonly isStaying = computed(() => STAYING_STATUSES.includes(this.selectedOrder()?.status as OrderStatus));
  /** Huỷ được: Đã đặt, Đang ở, hoặc khách tự check-in không đến (Chờ xác nhận trả); NV chỉ huỷ đơn chưa thu gì ngoài cọc. */
  protected readonly canCancel = computed(() => {
    const o = this.selectedOrder();
    if (!o) {
      return false;
    }
    const status = o.status === 'BOOKED' || o.status === 'CHECKED_IN' || (o.status === 'PENDING_CHECKOUT' && o.checkInMode === 'SELF');
    return status && (this.isManager() || o.payments.length === 0);
  });
  protected readonly canCollect = computed(() => {
    const order = this.selectedOrder();
    return order !== null && !CLOSED_STATUSES.includes(order.status);
  });

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
    this.actionError.set(null);
    this.paymentFormId.set(null);
    this.cancelPreview.set(null);
    this.checkoutOpen.set(false);
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
  /** Mở form thu tiền: thêm mới (mặc định số còn phải thu) hoặc sửa một khoản đã thu. */
  openPaymentForm(payment?: OrderPaymentDto): void {
    const order = this.selectedOrder();
    if (!order) {
      return;
    }
    this.paymentFormId.set(payment?.id ?? 0);
    this.paymentAmount.set(payment?.amount ?? order.dueAmount);
    this.paymentMethod.set(payment?.method ?? 'CASH');
    this.paymentNote.set(payment?.note ?? '');
    this.paymentError.set(null);
  }

  /** Đóng form thu tiền. */
  closePaymentForm(): void {
    this.paymentFormId.set(null);
  }

  /** Lưu khoản thu đang nhập (thêm mới hoặc sửa). */
  savePayment(): void {
    const order = this.selectedOrder();
    const formId = this.paymentFormId();
    if (!order || formId === null || this.savingPayment()) {
      return;
    }
    if (!(this.paymentAmount() > 0)) {
      this.paymentError.set('Số tiền phải lớn hơn 0.');
      return;
    }
    const request = { amount: this.paymentAmount(), method: this.paymentMethod(), note: this.paymentNote().trim() || null };
    const call = formId === 0
      ? this.orderService.addPayment(order.id, request)
      : this.orderService.updatePayment(order.id, formId, request);
    this.runPaymentCall(call);
  }

  /** Xoá một khoản đã thu (chỉ Quản lý), có hỏi lại trước khi xoá. */
  deletePayment(payment: OrderPaymentDto): void {
    const order = this.selectedOrder();
    if (!order || this.savingPayment() || !confirm(`Xoá khoản thu ${formatMoney(payment.amount)}?`)) {
      return;
    }
    this.paymentError.set(null);
    this.runPaymentCall(this.orderService.deletePayment(order.id, payment.id));
  }

  /** Giờ + ngày theo giờ máy, ví dụ "14:05, 13/10". */
  formatTime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }

  private runPaymentCall(call: Observable<OrderDto>): void {
    this.savingPayment.set(true);
    call.pipe(finalize(() => this.savingPayment.set(false))).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.paymentFormId.set(null);
      },
      error: (err) => this.paymentError.set(err?.error?.detail ?? 'Không lưu được khoản thu, thử lại sau.'),
    });
  }
  /** Xác nhận khách đã nhận phòng (đơn Đã đặt), có hỏi lại trước. */
  checkIn(): void {
    const order = this.selectedOrder();
    if (!order || this.acting() || !confirm(`Xác nhận khách đã nhận phòng ${order.roomNumber}?`)) {
      return;
    }
    this.runAction(this.orderService.checkIn(order.id));
  }

  /**
   * Mở form trả phòng. Giờ nhận mặc định = giờ nhận thực tế (hoặc giờ hẹn); giờ trả mặc định = giờ
   * hẹn với đơn Chờ xác nhận trả (khách tự trả), còn lại = bây giờ.
   */
  openCheckout(): void {
    const order = this.selectedOrder();
    if (!order) {
      return;
    }
    this.checkoutIn.set((order.actualCheckInAt ?? order.checkInAt).slice(0, 16));
    this.checkoutOut.set(order.status === 'PENDING_CHECKOUT' ? order.checkOutAt.slice(0, 16) : toLocalInput(new Date()));
    this.checkoutManualIds.set([]);
    this.checkoutMethod.set('CASH');
    this.checkoutPreview.set(null);
    this.actionError.set(null);
    this.checkoutOpen.set(true);
    this.refreshCheckoutPreview();
  }

  /** Đóng form trả phòng. */
  closeCheckout(): void {
    this.checkoutOpen.set(false);
  }

  /** Bật/tắt một phụ thu thêm tay rồi tính lại. */
  toggleManualSurcharge(id: number): void {
    this.checkoutManualIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
    this.refreshCheckoutPreview();
  }

  /** Tính lại tiền khi đổi giờ thực tế hoặc phụ thu. */
  refreshCheckoutPreview(): void {
    const order = this.selectedOrder();
    const request = this.buildCheckoutRequest();
    if (!order || !request) {
      return;
    }
    this.orderService.previewCheckout(order.id, request).subscribe({
      next: (preview) => {
        this.checkoutPreview.set(preview);
        this.actionError.set(null);
      },
      error: (err) => this.actionError.set(err?.error?.detail ?? 'Không tính được tiền, thử lại sau.'),
    });
  }

  /** Xác nhận trả phòng (thu luôn số còn lại theo hình thức đã chọn). */
  confirmCheckout(): void {
    const order = this.selectedOrder();
    const request = this.buildCheckoutRequest();
    if (!order || !request || this.acting()) {
      return;
    }
    this.runAction(this.orderService.checkout(order.id, request));
  }

  /** Mở form huỷ: lấy mức hoàn cọc app tự tính theo thời điểm hiện tại. */
  openCancel(): void {
    const order = this.selectedOrder();
    if (!order) {
      return;
    }
    this.checkoutOpen.set(false);
    this.actionError.set(null);
    this.cancelReason.set('');
    this.orderService.previewCancel(order.id).subscribe({
      next: (preview) => {
        this.cancelPreview.set(preview);
        this.cancelRefund.set(preview.defaultRefundAmount);
      },
      error: (err) => this.actionError.set(err?.error?.detail ?? 'Không tính được mức hoàn cọc, thử lại sau.'),
    });
  }

  /** Đóng form huỷ. */
  closeCancel(): void {
    this.cancelPreview.set(null);
  }

  /** Xác nhận huỷ đơn; số hoàn khác mức tự tính thì bắt buộc lý do. */
  confirmCancel(): void {
    const order = this.selectedOrder();
    const preview = this.cancelPreview();
    if (!order || !preview || this.acting()) {
      return;
    }
    const reason = this.cancelReason().trim();
    if (this.cancelRefund() !== preview.defaultRefundAmount && !reason) {
      this.actionError.set('Phải nhập lý do khi sửa số tiền hoàn.');
      return;
    }
    if (!confirm(`Huỷ đơn ${order.code}? Thao tác này không hoàn tác được.`)) {
      return;
    }
    this.runAction(this.orderService.cancel(order.id, { refundAmount: this.cancelRefund(), reason: reason || null }));
  }

  private buildCheckoutRequest(): CheckoutRequest | null {
    if (!this.checkoutIn() || !this.checkoutOut()) {
      return null;
    }
    return {
      actualCheckInAt: this.checkoutIn(),
      actualCheckOutAt: this.checkoutOut(),
      manualSurchargeIds: this.checkoutManualIds(),
      paymentMethod: this.checkoutMethod(),
    };
  }

  private runAction(call: Observable<OrderDto>): void {
    this.acting.set(true);
    this.actionError.set(null);
    call.pipe(finalize(() => this.acting.set(false))).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.cancelPreview.set(null);
        this.checkoutOpen.set(false);
        this.reload();
      },
      error: (err) => this.actionError.set(err?.error?.detail ?? 'Không thực hiện được, thử lại sau.'),
    });
  }
}

/** Giờ máy dạng giá trị ô datetime-local, ví dụ "2026-10-07T15:30". */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
