import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';

import { RoomTypeDto } from '../../core/room.models';
import { SurchargeDateRangeDto, SurchargeDto, SurchargeUpsertRequest, SurchargeWhenType, Weekday } from '../../core/surcharge.models';
import { SurchargeService } from '../../core/surcharge.service';
import { rejectInvalid } from '../../core/form-errors';

interface DateRangeRow {
  name: FormControl<string>;
  fromDate: FormControl<string>;
  toDate: FormControl<string>;
}

/** Thứ tự và nhãn hiển thị các ngày trong tuần, dùng cho cả template và dữ liệu gửi lên. */
export const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'T2' },
  { value: 'TUESDAY', label: 'T3' },
  { value: 'WEDNESDAY', label: 'T4' },
  { value: 'THURSDAY', label: 'T5' },
  { value: 'FRIDAY', label: 'T6' },
  { value: 'SATURDAY', label: 'T7' },
  { value: 'SUNDAY', label: 'CN' },
];

/**
 * Dialog "Thêm/Sửa phụ thu". Tuỳ "Áp dụng khi", chỉ hiện trường tương ứng: quá giờ (phút ân hạn),
 * vượt khách & thêm tay (một mức tiền), ngày trong tuần (chọn ngày + %), khoảng ngày (thêm/xoá
 * khoảng + %). Mỗi điều kiện gắn cố định một đơn vị tính, không cho chọn cách thu tự do.
 */
@Component({
  selector: 'app-surcharge-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule],
  templateUrl: './surcharge-dialog.html',
  styleUrl: './surcharge-dialog.scss',
})
export class SurchargeDialog {
  private readonly surchargeService = inject(SurchargeService);

  protected readonly weekdayOptions = WEEKDAY_OPTIONS;

  /** Phụ thu đang sửa; null nghĩa là đang thêm mới. */
  readonly surcharge = input<SurchargeDto | null>(null);
  /** Hạng phòng đang hoạt động, dùng cho checkbox "Áp dụng cho hạng phòng". */
  readonly roomTypes = input.required<RoomTypeDto[]>();
  readonly visible = input(false);

  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    whenType: new FormControl<SurchargeWhenType>('WEEKDAY', { nonNullable: true, validators: Validators.required }),
    amount: new FormControl<number | null>(null),
    graceMinutes: new FormControl<number | null>(15),
  });
  protected readonly dateRanges = new FormArray<FormGroup<DateRangeRow>>([]);
  protected readonly weekdays = signal<Set<Weekday>>(new Set());
  protected readonly selectedRoomTypeIds = signal<Set<number>>(new Set());
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly whenType = toSignal(this.form.controls.whenType.valueChanges, {
    initialValue: this.form.controls.whenType.value,
  });
  protected readonly isOverstay = computed(() => this.whenType() === 'OVERSTAY');
  protected readonly isExtraGuest = computed(() => this.whenType() === 'EXTRA_GUEST');
  protected readonly isWeekday = computed(() => this.whenType() === 'WEEKDAY');
  protected readonly isDateRange = computed(() => this.whenType() === 'DATE_RANGE');
  protected readonly isManual = computed(() => this.whenType() === 'MANUAL');
  protected readonly amountUnit = computed(() => {
    switch (this.whenType()) {
      case 'WEEKDAY':
      case 'DATE_RANGE':
        return '%';
      case 'EXTRA_GUEST':
        return 'đ/khách';
      default:
        return 'đ/lần';
    }
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.loadForm(this.surcharge());
      }
    });
  }

  private loadForm(surcharge: SurchargeDto | null): void {
    this.errorMessage.set(null);
    this.dateRanges.clear();
    if (surcharge) {
      this.form.setValue({
        name: surcharge.name,
        whenType: surcharge.whenType,
        amount: surcharge.amount,
        graceMinutes: surcharge.graceMinutes ?? 15,
      });
      this.weekdays.set(new Set(surcharge.weekdays));
      this.selectedRoomTypeIds.set(new Set(surcharge.roomTypeIds));
      surcharge.dateRanges.forEach((r) => this.dateRanges.push(this.rangeRow(r)));
    } else {
      this.form.setValue({ name: '', whenType: 'WEEKDAY', amount: null, graceMinutes: 15 });
      this.weekdays.set(new Set());
      this.selectedRoomTypeIds.set(new Set(this.roomTypes().map((t) => t.id)));
    }
  }

  private rangeRow(range?: SurchargeDateRangeDto): FormGroup<DateRangeRow> {
    return new FormGroup<DateRangeRow>({
      name: new FormControl(range?.name ?? '', { nonNullable: true, validators: Validators.required }),
      fromDate: new FormControl(range?.fromDate ?? '', { nonNullable: true, validators: Validators.required }),
      toDate: new FormControl(range?.toDate ?? '', { nonNullable: true, validators: Validators.required }),
    });
  }

  /** Thêm một khoảng ngày trống. */
  addDateRange(): void {
    this.dateRanges.push(this.rangeRow());
  }

  /** Xoá một khoảng ngày khỏi form (chưa lưu). */
  removeDateRange(index: number): void {
    this.dateRanges.removeAt(index);
  }

  /** Bật/tắt một ngày trong tuần. */
  toggleWeekday(day: Weekday): void {
    this.weekdays.update((set) => {
      const next = new Set(set);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  /** Bật/tắt một hạng phòng áp dụng. */
  toggleRoomType(id: number): void {
    this.selectedRoomTypeIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Đóng dialog không lưu. */
  cancel(): void {
    this.visibleChange.emit(false);
  }

  /** Ẩn phụ thu đang sửa (xoá mềm). */
  hide(): void {
    const current = this.surcharge();
    if (!current || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.surchargeService.setActive(current.id, false)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.saved.emit();
          this.visibleChange.emit(false);
        },
        error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không ẩn được phụ thu, thử lại sau.'),
      });
  }

  /** Lưu phụ thu (thêm mới hoặc sửa). */
  save(): void {
    if (this.submitting() || rejectInvalid(this.errorMessage, this.form, this.dateRanges)) {
      return;
    }
    const raw = this.form.getRawValue();
    if (this.isWeekday() && this.weekdays().size === 0) {
      this.errorMessage.set('Phải chọn ít nhất một ngày trong tuần.');
      return;
    }
    if (this.isDateRange() && this.dateRanges.length === 0) {
      this.errorMessage.set('Phải có ít nhất một khoảng ngày.');
      return;
    }
    if (this.selectedRoomTypeIds().size === 0) {
      this.errorMessage.set('Phải chọn ít nhất một hạng phòng.');
      return;
    }

    const request: SurchargeUpsertRequest = {
      name: raw.name,
      whenType: raw.whenType,
      amount: this.isOverstay() ? null : raw.amount,
      graceMinutes: this.isOverstay() ? (raw.graceMinutes ?? 15) : null,
      weekdays: this.isWeekday() ? Array.from(this.weekdays()) : null,
      dateRanges: this.isDateRange() ? this.dateRanges.getRawValue() : null,
      roomTypeIds: Array.from(this.selectedRoomTypeIds()),
    };

    this.errorMessage.set(null);
    this.submitting.set(true);
    const current = this.surcharge();
    const save$ = current ? this.surchargeService.update(current.id, request) : this.surchargeService.create(request);
    save$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.saved.emit();
        this.visibleChange.emit(false);
      },
      error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không lưu được phụ thu, thử lại sau.'),
    });
  }
}
