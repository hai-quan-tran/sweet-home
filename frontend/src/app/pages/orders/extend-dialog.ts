import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';

import { formatMoney } from '../../core/money';
import { RENTAL_TYPE_LABEL } from '../../core/order-labels';
import { ExtendPreviewResponse, ExtendRequest, ExtendType, OrderDto, PaymentMethod } from '../../core/order.models';
import { OrderService } from '../../core/order.service';

/**
 * Dialog Gia hạn: thêm giờ/ngày tại phòng đang ở, giờ trả mới phải cách đơn kế tiếp ≥ 1 tiếng
 * (backend tính, dialog chỉ hiển thị xem trước). Không gia hạn được thì khoá nút và gợi ý thêm giờ
 * tối đa còn được.
 */
@Component({
  selector: 'app-extend-dialog',
  imports: [FormsModule, ButtonModule, DialogModule],
  templateUrl: './extend-dialog.html',
  styleUrl: './extend-dialog.scss',
})
export class ExtendDialog {
  private readonly orderService = inject(OrderService);

  /** Đơn đang gia hạn. */
  readonly order = input.required<OrderDto>();
  /** Dialog đang mở hay không. */
  readonly visible = model(false);
  /** Phát ra đơn sau khi gia hạn thành công. */
  readonly extended = output<OrderDto>();

  protected readonly formatMoney = formatMoney;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly when = when;

  protected readonly type = signal<ExtendType>('HOUR');
  protected readonly quantity = signal(1);
  protected readonly collectNow = signal(false);
  protected readonly paymentMethod = signal<PaymentMethod>('CASH');
  protected readonly preview = signal<ExtendPreviewResponse | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly unitLabel = computed(() => (this.type() === 'HOUR' ? 'giờ' : 'ngày'));
  /** Giờ nên báo gia hạn: trước giờ trả hiện tại 1 tiếng. */
  protected readonly noticeBy = computed(() => {
    const p = this.preview();
    return p ? when(new Date(new Date(p.currentCheckOutAt).getTime() - 3_600_000)) : null;
  });
  /** Gợi ý chuyển sang thêm giờ khi mức đang chọn trùng đơn sau nhưng vẫn còn thêm được vài giờ. */
  protected readonly suggestHours = computed(() => {
    const p = this.preview();
    return p && !p.available && (p.maxExtraHours ?? 0) > 0 ? p.maxExtraHours : null;
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        untracked(() => {
          this.type.set('HOUR');
          this.quantity.set(1);
          this.collectNow.set(false);
          this.paymentMethod.set('CASH');
          this.error.set(null);
          this.preview.set(null);
          this.refresh();
        });
      }
    });
  }

  /** Đổi kiểu gia hạn (về 1 giờ/1 ngày) rồi tính lại. */
  setType(type: ExtendType): void {
    this.type.set(type);
    this.quantity.set(1);
    this.refresh();
  }

  /** Tăng/giảm số giờ/ngày (tối thiểu 1) rồi tính lại. */
  step(delta: number): void {
    this.quantity.set(Math.max(1, this.quantity() + delta));
    this.refresh();
  }

  /** Đổi sang thêm giờ với số giờ tối đa còn giữ được phòng. */
  useSuggestedHours(): void {
    const hours = this.suggestHours();
    if (hours) {
      this.type.set('HOUR');
      this.quantity.set(hours);
      this.refresh();
    }
  }

  /** Gọi backend tính giờ trả mới, phí và giới hạn theo đơn kế tiếp. */
  refresh(): void {
    this.orderService.previewExtend(this.order().id, this.request()).subscribe({
      next: (p) => {
        this.preview.set(p);
        this.error.set(null);
      },
      error: (err) => this.error.set(err?.error?.detail ?? 'Không tính được gia hạn, thử lại sau.'),
    });
  }

  /** Xác nhận gia hạn. */
  confirm(): void {
    if (this.saving() || !this.preview()?.available) {
      return;
    }
    this.saving.set(true);
    this.orderService.extend(this.order().id, this.request())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (order) => {
          this.extended.emit(order);
          this.visible.set(false);
        },
        error: (err) => this.error.set(err?.error?.detail ?? 'Không gia hạn được, thử lại sau.'),
      });
  }

  private request(): ExtendRequest {
    return {
      type: this.type(),
      quantity: this.quantity(),
      collectNow: this.collectNow(),
      paymentMethod: this.collectNow() ? this.paymentMethod() : null,
    };
  }
}

/** Giờ · ngày/tháng, ví dụ "13:00 · 08/10" (chuỗi giờ không múi giờ từ backend hoặc Date). */
function when(value: string | Date): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
