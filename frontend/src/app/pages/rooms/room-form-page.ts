import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { formatMoney } from '../../core/money';
import { CheckInMode, RoomDto, RoomPhotoDto, RoomPricingMode, RoomTypeDto } from '../../core/room.models';
import { RoomService } from '../../core/room.service';

/** Màn Thêm/Sửa phòng: dùng chung một form, phân biệt qua route param `id`. */
@Component({
  selector: 'app-room-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './room-form-page.html',
  styleUrl: './room-form-page.scss',
})
export class RoomFormPage {
  private readonly roomService = inject(RoomService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly formatMoney = formatMoney;
  protected readonly roomId = signal<number | null>(this.parseId());
  protected readonly isEdit = computed(() => this.roomId() !== null);
  protected readonly roomTypes = signal<RoomTypeDto[]>([]);
  protected readonly existingPhotos = signal<RoomPhotoDto[]>([]);
  protected readonly pendingPhotos = signal<{ file: File; previewUrl: string }[]>([]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly form = new FormGroup({
    roomNumber: new FormControl('', { nonNullable: true, validators: Validators.required }),
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    floor: new FormControl<number | null>(null),
    roomTypeId: new FormControl<number | null>(null, Validators.required),
    maxGuests: new FormControl(2, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    bedConfig: new FormControl(''),
    description: new FormControl(''),
    pricingMode: new FormControl<RoomPricingMode>('ROOM_TYPE', { nonNullable: true }),
    ownTwoHourPrice: new FormControl<number | null>(null),
    ownExtraHourPrice: new FormControl<number | null>(null),
    ownOvernightPrice: new FormControl<number | null>(null),
    ownDailyPrice: new FormControl<number | null>(null),
    defaultCheckInMode: new FormControl<CheckInMode>('SELF', { nonNullable: true }),
    checkInGuide: new FormControl(''),
    acceptingBookings: new FormControl(true, { nonNullable: true }),
  });

  // form.controls.*.value không phải signal nên computed() không tự chạy lại khi người dùng đổi
  // lựa chọn; phải đưa valueChanges qua toSignal() thì selectedRoomType mới cập nhật đúng lúc.
  private readonly roomTypeIdValue = toSignal(this.form.controls.roomTypeId.valueChanges, {
    initialValue: this.form.controls.roomTypeId.value,
  });
  protected readonly selectedRoomType = computed(() => this.roomTypes().find((t) => t.id === this.roomTypeIdValue()) ?? null);

  constructor() {
    this.roomService.pricingOverview().subscribe((overview) => this.roomTypes.set(overview.roomTypes));
    const id = this.roomId();
    if (id !== null) {
      this.roomService.get(id).subscribe((room) => {
        this.fillForm(room);
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
    }
  }

  private parseId(): number | null {
    const raw = this.route.snapshot.paramMap.get('id');
    return raw ? Number(raw) : null;
  }

  private fillForm(room: RoomDto): void {
    this.existingPhotos.set(room.photos);
    this.form.setValue({
      roomNumber: room.roomNumber,
      name: room.name,
      floor: room.floor,
      roomTypeId: room.roomTypeId,
      maxGuests: room.maxGuests,
      bedConfig: room.bedConfig ?? '',
      description: room.description ?? '',
      pricingMode: room.pricingMode,
      ownTwoHourPrice: room.ownTwoHourPrice,
      ownExtraHourPrice: room.ownExtraHourPrice,
      ownOvernightPrice: room.ownOvernightPrice,
      ownDailyPrice: room.ownDailyPrice,
      defaultCheckInMode: room.defaultCheckInMode,
      checkInGuide: room.checkInGuide ?? '',
      acceptingBookings: room.acceptingBookings,
    });
  }

  /** Chọn thêm ảnh: xem trước ngay, lưu thật khi bấm "Lưu phòng" (thêm) hoặc ngay lập tức (sửa). */
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    const id = this.roomId();
    if (id !== null) {
      this.roomService.addPhotos(id, files).subscribe((room) => this.existingPhotos.set(room.photos));
      return;
    }
    const staged = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    this.pendingPhotos.update((list) => [...list, ...staged]);
  }

  /** Bỏ một ảnh chưa lưu (chỉ có khi đang thêm phòng mới). */
  removePendingPhoto(index: number): void {
    this.pendingPhotos.update((list) => {
      URL.revokeObjectURL(list[index].previewUrl);
      return list.filter((_, i) => i !== index);
    });
  }

  /** Xoá một ảnh đã lưu (chỉ có khi đang sửa phòng). */
  removeExistingPhoto(photo: RoomPhotoDto): void {
    const id = this.roomId();
    if (id === null) {
      return;
    }
    this.roomService.deletePhoto(id, photo.id).subscribe((room) => this.existingPhotos.set(room.photos));
  }

  /** Lưu phòng (thêm mới hoặc sửa). */
  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.pricingMode === 'OWN' && (raw.ownTwoHourPrice == null || raw.ownExtraHourPrice == null
        || raw.ownOvernightPrice == null || raw.ownDailyPrice == null)) {
      this.errorMessage.set('Phải nhập đủ 4 mức giá khi chọn giá riêng cho phòng.');
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const request = {
      roomNumber: raw.roomNumber,
      name: raw.name,
      floor: raw.floor,
      roomTypeId: raw.roomTypeId!,
      maxGuests: raw.maxGuests,
      bedConfig: raw.bedConfig || null,
      description: raw.description || null,
      pricingMode: raw.pricingMode,
      ownTwoHourPrice: raw.ownTwoHourPrice,
      ownExtraHourPrice: raw.ownExtraHourPrice,
      ownOvernightPrice: raw.ownOvernightPrice,
      ownDailyPrice: raw.ownDailyPrice,
      defaultCheckInMode: raw.defaultCheckInMode,
      checkInGuide: raw.checkInGuide || null,
      acceptingBookings: raw.acceptingBookings,
    };

    const id = this.roomId();
    const save$ = id !== null ? this.roomService.update(id, request) : this.roomService.create(request);
    save$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (room) => this.afterSave(room),
      error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không lưu được phòng, thử lại sau.'),
    });
  }

  private afterSave(room: RoomDto): void {
    const files = this.pendingPhotos().map((p) => p.file);
    if (files.length > 0) {
      this.roomService.addPhotos(room.id, files).subscribe(() => this.router.navigateByUrl('/phong'));
      return;
    }
    this.router.navigateByUrl('/phong');
  }
}
