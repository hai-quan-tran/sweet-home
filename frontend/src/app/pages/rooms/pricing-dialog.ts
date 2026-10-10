import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';

import { RoomService } from '../../core/room.service';
import { PricingOverview, RoomTypeDto } from '../../core/room.models';

interface RoomTypeRow {
  id: FormControl<number | null>;
  name: FormControl<string>;
  twoHourPrice: FormControl<number>;
  extraHourPrice: FormControl<number>;
  overnightPrice: FormControl<number>;
  dailyPrice: FormControl<number>;
}

/** Dialog "Sửa bảng giá": thêm/sửa/xoá hạng phòng và khung giờ áp dụng chung, lưu trong một lần. */
@Component({
  selector: 'app-pricing-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule],
  templateUrl: './pricing-dialog.html',
  styleUrl: './pricing-dialog.scss',
})
export class PricingDialog {
  private readonly roomService = inject(RoomService);

  /** Dữ liệu hiện tại để nạp vào form khi mở dialog. */
  readonly overview = input.required<PricingOverview | null>();
  /** Dialog đang mở hay không. */
  readonly visible = input(false);

  readonly visibleChange = output<boolean>();
  readonly saved = output<PricingOverview>();

  protected readonly rows = new FormArray<FormGroup<RoomTypeRow>>([]);
  protected readonly settingsForm = new FormGroup({
    minHours: new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    overnightCheckIn: new FormControl('21:00', { nonNullable: true, validators: Validators.required }),
    overnightCheckOut: new FormControl('12:00', { nonNullable: true, validators: Validators.required }),
    dailyCheckIn: new FormControl('14:00', { nonNullable: true, validators: Validators.required }),
    dailyCheckOut: new FormControl('12:00', { nonNullable: true, validators: Validators.required }),
  });

  protected readonly roomNumbersByRow = signal<(string[] | null)[]>([]);
  protected readonly hiddenTypes = signal<RoomTypeDto[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const data = this.overview();
      if (data && this.visible()) {
        this.loadForm(data);
      }
    });
  }

  private loadForm(data: PricingOverview): void {
    this.errorMessage.set(null);
    this.rows.clear();
    const roomNumbers: (string[] | null)[] = [];
    for (const type of data.roomTypes) {
      this.rows.push(this.rowFor(type));
      roomNumbers.push(type.roomNumbers);
    }
    this.roomNumbersByRow.set(roomNumbers);
    this.hiddenTypes.set(data.hiddenRoomTypes);
    this.settingsForm.setValue({
      minHours: data.settings.minHours,
      overnightCheckIn: data.settings.overnightCheckIn.slice(0, 5),
      overnightCheckOut: data.settings.overnightCheckOut.slice(0, 5),
      dailyCheckIn: data.settings.dailyCheckIn.slice(0, 5),
      dailyCheckOut: data.settings.dailyCheckOut.slice(0, 5),
    });
  }

  private rowFor(type: RoomTypeDto): FormGroup<RoomTypeRow> {
    return new FormGroup<RoomTypeRow>({
      id: new FormControl(type.id),
      name: new FormControl(type.name, { nonNullable: true, validators: Validators.required }),
      twoHourPrice: new FormControl(type.twoHourPrice, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      extraHourPrice: new FormControl(type.extraHourPrice, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      overnightPrice: new FormControl(type.overnightPrice, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      dailyPrice: new FormControl(type.dailyPrice, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    });
  }

  /** Thêm một dòng hạng phòng trống. */
  addRow(): void {
    this.rows.push(
      new FormGroup<RoomTypeRow>({
        id: new FormControl(null),
        name: new FormControl('', { nonNullable: true, validators: Validators.required }),
        twoHourPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
        extraHourPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
        overnightPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
        dailyPrice: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      }),
    );
    this.roomNumbersByRow.update((list) => [...list, null]);
  }

  /** Ẩn một dòng hạng phòng (chỉ ở form, lưu mới áp dụng; hạng còn phòng sẽ bị chặn khi lưu). */
  removeRow(index: number): void {
    this.rows.removeAt(index);
    this.roomNumbersByRow.update((list) => list.filter((_, i) => i !== index));
  }

  /** Khôi phục một hạng phòng đã ẩn: đưa trở lại danh sách đang sửa, lưu mới áp dụng. */
  restoreType(type: RoomTypeDto): void {
    this.hiddenTypes.update((list) => list.filter((t) => t.id !== type.id));
    this.rows.push(this.rowFor(type));
    this.roomNumbersByRow.update((list) => [...list, type.roomNumbers]);
  }

  /** Đóng dialog không lưu. */
  cancel(): void {
    this.visibleChange.emit(false);
  }

  /** Lưu bảng giá. */
  save(): void {
    if (this.rows.invalid || this.settingsForm.invalid || this.submitting()) {
      this.rows.markAllAsTouched();
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const settings = this.settingsForm.getRawValue();
    this.roomService
      .savePricingOverview({
        roomTypes: this.rows.controls.map((row) => row.getRawValue()),
        settings,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (overview) => {
          this.saved.emit(overview);
          this.visibleChange.emit(false);
        },
        error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không lưu được bảng giá, thử lại sau.'),
      });
  }
}
