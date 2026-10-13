import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { catchError, debounceTime, of, switchMap } from 'rxjs';

import { CheckInMode, RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { PaymentMethod, OrderPreviewRequest, OrderPreviewResponse, OrderSource, RentalType } from '../../core/order.models';
import { OrderService } from '../../core/order.service';
import { formatMoney } from '../../core/money';

const RENTAL_TYPE_LABEL: Record<RentalType, string> = { HOURLY: 'Theo giờ', OVERNIGHT: 'Qua đêm', DAILY: 'Theo ngày' };
const SOURCE_OPTIONS: { value: OrderSource; label: string }[] = [
  { value: 'ZALO', label: 'Zalo' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'PHONE', label: 'Gọi điện' },
  { value: 'REGULAR', label: 'Khách quen' },
  { value: 'OTHER', label: 'Khác' },
];

/** Màn Tạo đơn thuê: phòng & thời gian tự tính giờ trả + tóm tắt tiền cập nhật trực tiếp. */
@Component({
  selector: 'app-order-form-page',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, DatePipe],
  templateUrl: './order-form-page.html',
  styleUrl: './order-form-page.scss',
})
export class OrderFormPage {
  private readonly roomService = inject(RoomService);
  private readonly orderService = inject(OrderService);
  private readonly router = inject(Router);

  protected readonly formatMoney = formatMoney;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly sourceOptions = SOURCE_OPTIONS;

  protected readonly rooms = signal<RoomDto[]>([]);
  protected readonly preview = signal<OrderPreviewResponse | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showDoorCode = signal(false);

  protected readonly form = new FormGroup({
    rentalType: new FormControl<RentalType>('HOURLY', { nonNullable: true }),
    roomId: new FormControl<number | null>(null, Validators.required),
    checkInDate: new FormControl(today(), { nonNullable: true, validators: Validators.required }),
    checkInTime: new FormControl('15:00', { nonNullable: true }),
    quantity: new FormControl(2, { nonNullable: true, validators: Validators.min(1) }),
    checkInMode: new FormControl<CheckInMode>('SELF', { nonNullable: true }),
    doorCode: new FormControl('', { nonNullable: true }),
    guestName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    guestPhone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    guestIdNumber: new FormControl('', { nonNullable: true }),
    guestCount: new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    source: new FormControl<OrderSource>('ZALO', { nonNullable: true }),
    note: new FormControl('', { nonNullable: true }),
    deposit: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    depositMethod: new FormControl<PaymentMethod>('TRANSFER', { nonNullable: true }),
    discount: new FormControl(0, { nonNullable: true, validators: Validators.min(0) }),
    discountReason: new FormControl('', { nonNullable: true }),
  });

  protected readonly rentalTypes: RentalType[] = ['HOURLY', 'OVERNIGHT', 'DAILY'];

  protected readonly selectedRoom = computed(() => this.rooms().find((r) => r.id === this.form.controls.roomId.value) ?? null);
  protected readonly isHourly = computed(() => this.form.controls.rentalType.value === 'HOURLY');

  constructor() {
    this.roomService.list().subscribe((rooms) => {
      const available = rooms.filter((r) => r.acceptingBookings);
      this.rooms.set(available);
      if (available.length > 0 && this.form.controls.roomId.value === null) {
        this.form.controls.roomId.setValue(available[0].id);
        this.form.controls.checkInMode.setValue(available[0].defaultCheckInMode);
      }
    });

    this.form.controls.roomId.valueChanges.subscribe((id) => {
      const room = this.rooms().find((r) => r.id === id);
      if (room) {
        this.form.controls.checkInMode.setValue(room.defaultCheckInMode);
      }
    });
    this.form.controls.rentalType.valueChanges.subscribe((type) => {
      this.form.controls.quantity.setValue(type === 'DAILY' ? 1 : 2);
    });

    this.form.valueChanges
      .pipe(
        debounceTime(300),
        switchMap(() => {
          const request = this.buildPreviewRequest();
          if (!request) {
            return of(null);
          }
          this.previewLoading.set(true);
          return this.orderService.preview(request).pipe(
            catchError(() => of(null)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.previewLoading.set(false);
        this.preview.set(result);
      });
  }

  private buildPreviewRequest(): OrderPreviewRequest | null {
    const raw = this.form.getRawValue();
    if (raw.roomId === null || !raw.checkInDate) {
      return null;
    }
    if (raw.rentalType === 'HOURLY' && !raw.checkInTime) {
      return null;
    }
    return {
      roomId: raw.roomId,
      rentalType: raw.rentalType,
      checkInDate: raw.checkInDate,
      checkInTime: raw.rentalType === 'HOURLY' ? raw.checkInTime : null,
      quantity: raw.rentalType === 'OVERNIGHT' ? null : raw.quantity,
      guestCount: raw.guestCount,
      discount: raw.discount,
      deposit: raw.deposit,
    };
  }

  /** Tăng/giảm số giờ hoặc số ngày thuê. */
  stepQuantity(delta: number): void {
    const next = Math.max(1, this.form.controls.quantity.value + delta);
    this.form.controls.quantity.setValue(next);
  }

  /** Tăng/giảm số khách. */
  stepGuestCount(delta: number): void {
    const next = Math.max(1, this.form.controls.guestCount.value + delta);
    this.form.controls.guestCount.setValue(next);
  }

  /** Lỗi ô tiền cọc: bắt buộc > 0 và không vượt tổng tiền đang xem trước; null nếu hợp lệ. */
  depositError(): string | null {
    const control = this.form.controls.deposit;
    if (control.invalid) {
      return control.touched ? 'Bắt buộc nhập tiền cọc lớn hơn 0' : null;
    }
    const total = this.preview()?.totalAmount;
    return total !== undefined && control.value > total ? 'Tiền cọc không được vượt tổng tiền' : null;
  }

  /** Lưu đơn. */
  submit(copyMessage: boolean): void {
    if (this.form.invalid || this.submitting() || this.depositError() !== null) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.checkInMode === 'SELF' && !raw.doorCode.trim()) {
      this.errorMessage.set('Phải nhập mã cửa khi khách tự check-in.');
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.orderService
      .create({
        roomId: raw.roomId!,
        rentalType: raw.rentalType,
        checkInDate: raw.checkInDate,
        checkInTime: raw.rentalType === 'HOURLY' ? raw.checkInTime : null,
        quantity: raw.rentalType === 'OVERNIGHT' ? null : raw.quantity,
        guestName: raw.guestName,
        guestPhone: raw.guestPhone,
        guestIdNumber: raw.guestIdNumber || null,
        guestCount: raw.guestCount,
        source: raw.source,
        note: raw.note || null,
        checkInMode: raw.checkInMode,
        doorCode: raw.doorCode || null,
        deposit: raw.deposit,
        depositMethod: raw.depositMethod,
        discount: raw.discount,
        discountReason: raw.discountReason || null,
      })
      .subscribe({
        next: (order) => {
          this.submitting.set(false);
          this.router.navigate(['/don-thue'], { queryParams: { id: order.id, copy: copyMessage ? 1 : null } });
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.detail ?? 'Không tạo được đơn, thử lại sau.');
        },
      });
  }
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
