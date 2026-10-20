import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { catchError, debounceTime, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../core/auth.service';

import { CheckInMode, RoomDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';
import { OrderDto, OrderPreviewRequest, OrderPreviewResponse, OrderSource, OrderUpsertRequest, PaymentMethod, RentalType } from '../../core/order.models';
import { OrderService } from '../../core/order.service';
import { formatMoney } from '../../core/money';
import { rejectInvalid } from '../../core/form-errors';

const RENTAL_TYPE_LABEL: Record<RentalType, string> = { HOURLY: 'Theo giờ', OVERNIGHT: 'Qua đêm', DAILY: 'Theo ngày' };
const SOURCE_OPTIONS: { value: OrderSource; label: string }[] = [
  { value: 'ZALO', label: 'Zalo' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'PHONE', label: 'Gọi điện' },
  { value: 'REGULAR', label: 'Khách quen' },
  { value: 'OTHER', label: 'Khác' },
];

/** Màn Tạo/Sửa đơn thuê: phòng & thời gian tự tính giờ trả + tóm tắt tiền cập nhật trực tiếp. Sửa đơn qua route có :id (chỉ đơn Đã đặt). */
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
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected readonly formatMoney = formatMoney;
  protected readonly rentalTypeLabel = RENTAL_TYPE_LABEL;
  protected readonly sourceOptions = SOURCE_OPTIONS;

  protected readonly rooms = signal<RoomDto[]>([]);
  protected readonly preview = signal<OrderPreviewResponse | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showDoorCode = signal(false);
  /** Đơn đang sửa; null khi tạo mới. */
  protected readonly editing = signal<OrderDto | null>(null);
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');

  private readonly defaultCheckIn = nearestHour(new Date());

  protected readonly form = new FormGroup({
    rentalType: new FormControl<RentalType>('HOURLY', { nonNullable: true }),
    roomId: new FormControl<number | null>(null, Validators.required),
    checkInDate: new FormControl(this.defaultCheckIn.date, { nonNullable: true, validators: Validators.required }),
    checkInTime: new FormControl(this.defaultCheckIn.time, { nonNullable: true }),
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
    const editId = Number(this.route.snapshot.paramMap.get('id')) || null;
    // Mở từ ô trống của Lịch đặt phòng: điền sẵn phòng, ngày, giờ nhận.
    const query = this.route.snapshot.queryParamMap;
    this.form.patchValue({
      checkInDate: query.get('date') ?? this.form.controls.checkInDate.value,
      checkInTime: query.get('time') ?? this.form.controls.checkInTime.value,
    });
    forkJoin({ rooms: this.roomService.list(), order: editId ? this.orderService.get(editId) : of(null) }).subscribe(({ rooms, order }) => {
      const available = rooms.filter((r) => r.acceptingBookings || r.id === order?.roomId);
      this.rooms.set(available);
      if (order) {
        this.loadOrder(order);
      } else if (available.length > 0 && this.form.controls.roomId.value === null) {
        const room = available.find((r) => r.id === Number(query.get('roomId'))) ?? available[0];
        this.form.controls.roomId.setValue(room.id);
        this.form.controls.checkInMode.setValue(room.defaultCheckInMode);
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
      excludeOrderId: this.editing()?.id ?? null,
    };
  }

  /**
   * Đổ dữ liệu đơn cần sửa vào form. Đặt loại thuê và phòng trước vì 2 ô này tự đặt lại số lượng và
   * hình thức check-in mặc định khi đổi. Mã cửa/CCCD để trống (trống = giữ giá trị cũ). Nhân viên
   * không sửa được tiền cọc.
   */
  private loadOrder(order: OrderDto): void {
    if (order.status !== 'BOOKED') {
      this.errorMessage.set('Chỉ sửa được đơn ở trạng thái Đã đặt.');
    }
    this.editing.set(order);
    const controls = this.form.controls;
    controls.rentalType.setValue(order.rentalType);
    controls.roomId.setValue(order.roomId);
    const hours = Math.round((Date.parse(order.checkOutAt) - Date.parse(order.checkInAt)) / 3_600_000);
    const days = Math.round((Date.parse(order.checkOutAt.slice(0, 10)) - Date.parse(order.checkInAt.slice(0, 10))) / 86_400_000);
    this.form.patchValue({
      checkInDate: order.checkInAt.slice(0, 10),
      checkInTime: order.checkInAt.slice(11, 16),
      quantity: order.rentalType === 'DAILY' ? days : hours,
      checkInMode: order.checkInMode,
      doorCode: '',
      guestName: order.guestName,
      guestPhone: order.guestPhone,
      guestIdNumber: '',
      guestCount: order.guestCount,
      source: order.source,
      note: order.note ?? '',
      deposit: order.deposit,
      depositMethod: order.depositMethod ?? 'TRANSFER',
      discount: order.discount,
      discountReason: order.discountReason ?? '',
    });
    if (!this.isManager()) {
      controls.deposit.disable();
      controls.depositMethod.disable();
    }
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

  /** Lưu đơn (tạo mới hoặc lưu thay đổi khi đang sửa). */
  submit(copyMessage: boolean): void {
    if (this.submitting() || rejectInvalid(this.errorMessage, this.form) || this.depositError() !== null) {
      return;
    }
    const raw = this.form.getRawValue();
    const editing = this.editing();
    if (raw.checkInMode === 'SELF' && !raw.doorCode.trim() && !editing?.hasDoorCode) {
      this.errorMessage.set('Phải nhập mã cửa khi khách tự check-in.');
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const request: OrderUpsertRequest = {
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
    };
    (editing ? this.orderService.update(editing.id, request) : this.orderService.create(request))
      .subscribe({
        next: (order) => {
          this.submitting.set(false);
          this.router.navigate(['/don-thue'], { queryParams: { id: order.id, action: copyMessage ? 'copy' : null } });
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.detail ?? (editing ? 'Không lưu được đơn, thử lại sau.' : 'Không tạo được đơn, thử lại sau.'));
        },
      });
  }
}

/** Giờ nhận mặc định: bây giờ làm tròn tới giờ tròn gần nhất (từ phút 30 làm tròn lên, có thể sang ngày mai). */
export function nearestHour(now: Date): { date: string; time: string } {
  const d = new Date(now);
  d.setMinutes(d.getMinutes() + 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:00` };
}
