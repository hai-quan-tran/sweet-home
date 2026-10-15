import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, finalize, forkJoin, shareReplay } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { formatMoney } from '../../core/money';
import { buildOrderMessageContext, renderMessageTemplate } from '../../core/message-template';
import { PAYMENT_METHOD_LABEL, RENTAL_TYPE_LABEL, SOURCE_LABEL, STATUS_TAG } from '../../core/order-labels';
import {
  CancelPreviewResponse,
  CheckoutPreviewResponse,
  CheckoutRequest,
  OrderDto,
  OrderPaymentDto,
  OrderStatus,
  PaymentMethod,
} from '../../core/order.models';
import { OrderService } from '../../core/order.service';
import { RoomService } from '../../core/room.service';
import { HomestayInfoDto, MessageTemplateDto } from '../../core/settings.models';
import { SettingsService } from '../../core/settings.service';
import { ExtendDialog } from './extend-dialog';

const CLOSED_STATUSES: OrderStatus[] = ['CHECKED_OUT', 'CANCELLED'];
const STAYING_STATUSES: OrderStatus[] = ['CHECKED_IN', 'OVERSTAY', 'PENDING_CHECKOUT'];

/**
 * Chi tiết một đơn kèm các thao tác vòng đời (nhận/trả phòng, huỷ, thu tiền, sao chép tin nhắn).
 * Dùng chung cho màn Đơn thuê và Lịch đặt phòng; báo {@link changed} sau mỗi thao tác đổi trạng thái
 * để màn cha tải lại danh sách/lịch.
 */
@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, FormsModule, ExtendDialog],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
  host: { class: 'card', role: 'complementary', 'aria-label': 'Chi tiết đơn' },
})
export class OrderDetail {
  private readonly orderService = inject(OrderService);
  private readonly roomService = inject(RoomService);
  private readonly settingsService = inject(SettingsService);
  private readonly auth = inject(AuthService);

  /** Id đơn cần hiện. */
  readonly orderId = input.required<number>();
  /** Tự sao chép tin nhắn ngay khi tải xong (sau khi vừa tạo đơn). */
  readonly autoCopy = input(false);
  /** Phát ra đơn mới sau khi nhận/trả phòng hoặc huỷ. */
  readonly changed = output<OrderDto>();

  protected readonly formatMoney = formatMoney;
  protected readonly statusTag = STATUS_TAG;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly sourceLabel = SOURCE_LABEL;
  protected readonly paymentMethodLabel = PAYMENT_METHOD_LABEL;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');

  protected readonly order = signal<OrderDto | null>(null);
  protected readonly roomGuide = signal<string | null>(null);
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

  /** Dialog Gia hạn đang mở. */
  protected readonly extendOpen = signal(false);

  protected readonly selectedTemplate = computed(() => this.templates().find((t) => t.id === this.selectedTemplateId()) ?? null);
  protected readonly isStaying = computed(() => STAYING_STATUSES.includes(this.order()?.status as OrderStatus));
  /** Huỷ được: Đã đặt, Đang ở, hoặc khách tự check-in không đến (Chờ xác nhận trả); NV chỉ huỷ đơn chưa thu gì ngoài cọc. */
  protected readonly canCancel = computed(() => {
    const o = this.order();
    if (!o) {
      return false;
    }
    const status = o.status === 'BOOKED' || o.status === 'CHECKED_IN' || (o.status === 'PENDING_CHECKOUT' && o.checkInMode === 'SELF');
    return status && (this.isManager() || o.payments.length === 0);
  });
  protected readonly canCollect = computed(() => {
    const order = this.order();
    return order !== null && !CLOSED_STATUSES.includes(order.status);
  });

  /** Mẫu tin nhắn và thông tin homestay chỉ tải một lần cho mọi đơn được mở. */
  private readonly references$ = forkJoin({
    templates: this.settingsService.listTemplates(),
    homestay: this.settingsService.getHomestay(),
  }).pipe(shareReplay(1));

  constructor() {
    effect(() => {
      const id = this.orderId();
      untracked(() => this.open(id));
    });
  }

  /** Tải đơn (kèm mẫu tin nhắn, hướng dẫn phòng hiện hành) và đặt lại mọi form đang mở. */
  private open(id: number): void {
    this.doorCode.set(null);
    this.actionError.set(null);
    this.paymentFormId.set(null);
    this.cancelPreview.set(null);
    this.checkoutOpen.set(false);
    this.copyFeedback.set(null);
    forkJoin({ order: this.orderService.get(id), refs: this.references$ }).subscribe(({ order, refs }) => {
      this.templates.set(refs.templates);
      this.homestay.set(refs.homestay);
      this.order.set(order);
      this.selectedTemplateId.set(refs.templates.find((t) => t.defaultForCheckInMode === order.checkInMode)?.id ?? refs.templates[0]?.id ?? null);
      this.roomService.get(order.roomId).subscribe((room) => {
        this.roomGuide.set(room.checkInGuide);
        if (this.autoCopy()) {
          this.copyMessage();
        }
      });
    });
  }

  /** Hiện mã cửa của đơn. */
  revealDoorCode(): void {
    const order = this.order();
    if (!order || this.revealingDoorCode()) {
      return;
    }
    this.revealingDoorCode.set(true);
    this.orderService.doorCode(order.id).subscribe((res) => {
      this.doorCode.set(res.doorCode);
      this.revealingDoorCode.set(false);
    });
  }

  /**
   * Sao chép tin nhắn theo mẫu đang chọn vào clipboard. Mẫu có {ma_cua} thì luôn lấy mã cửa qua API
   * (kể cả khi đã hiện) để backend ghi nhật ký "sao chép tin nhắn có mã cửa" — đơn được tính là đã gửi mã.
   */
  copyMessage(): void {
    const order = this.order();
    const template = this.selectedTemplate();
    const homestay = this.homestay();
    if (!order || !template || !homestay) {
      return;
    }
    const render = (code: string | null) => {
      const context = buildOrderMessageContext(order, homestay, this.roomGuide(), code);
      const text = renderMessageTemplate(template.body, context);
      navigator.clipboard?.writeText(text).then(
        () => this.copyFeedback.set('Đã sao chép tin nhắn.'),
        () => this.copyFeedback.set('Không sao chép được, hãy thử lại.'),
      );
    };
    if (template.containsDoorCode && order.hasDoorCode) {
      this.orderService.doorCode(order.id, true).subscribe((res) => {
        this.doorCode.set(res.doorCode);
        render(res.doorCode);
      });
    } else {
      render(this.doorCode());
    }
  }

  /** Mở form thu tiền: thêm mới (mặc định số còn phải thu) hoặc sửa một khoản đã thu. */
  openPaymentForm(payment?: OrderPaymentDto): void {
    const order = this.order();
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
    const order = this.order();
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
    const order = this.order();
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
        this.order.set(order);
        this.paymentFormId.set(null);
      },
      error: (err) => this.paymentError.set(err?.error?.detail ?? 'Không lưu được khoản thu, thử lại sau.'),
    });
  }

  /** Xác nhận khách đã nhận phòng (đơn Đã đặt), có hỏi lại trước. */
  checkIn(): void {
    const order = this.order();
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
    const order = this.order();
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
    const order = this.order();
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
    const order = this.order();
    const request = this.buildCheckoutRequest();
    if (!order || !request || this.acting()) {
      return;
    }
    this.runAction(this.orderService.checkout(order.id, request));
  }

  /** Mở form huỷ: lấy mức hoàn cọc app tự tính theo thời điểm hiện tại. */
  openCancel(): void {
    const order = this.order();
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
    const order = this.order();
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

  /** Gia hạn xong: cập nhật đơn đang xem và báo màn cha tải lại. */
  onExtended(order: OrderDto): void {
    this.order.set(order);
    this.changed.emit(order);
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
        this.order.set(order);
        this.cancelPreview.set(null);
        this.checkoutOpen.set(false);
        this.changed.emit(order);
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
