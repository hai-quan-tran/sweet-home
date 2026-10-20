import { Component, computed, inject, signal, viewChild, ElementRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { rejectInvalid } from '../../core/form-errors';
import { SAMPLE_ORDER_CODE, buildSampleMessageContext, renderMessageTemplate } from '../../core/message-template';
import { CheckInMode } from '../../core/room.models';
import { HomestayInfoDto, MessageTemplateDto } from '../../core/settings.models';
import { SettingsService } from '../../core/settings.service';

type Tab = 'mau-tin-nhan' | 'thong-tin';

const VARIABLES: { key: string; label: string; sensitive?: boolean }[] = [
  { key: 'ten_khach', label: 'Tên khách' },
  { key: 'ma_don', label: 'Mã đơn' },
  { key: 'phong', label: 'Phòng' },
  { key: 'loai_thue', label: 'Loại thuê' },
  { key: 'gio_nhan', label: 'Giờ nhận' },
  { key: 'gio_tra', label: 'Giờ trả' },
  { key: 'so_khach', label: 'Số khách' },
  { key: 'tong_tien', label: 'Tổng tiền' },
  { key: 'da_coc', label: 'Đã cọc' },
  { key: 'con_phai_thu', label: 'Còn phải thu' },
  { key: 'ma_cua', label: 'Mã cửa', sensitive: true },
  { key: 'huong_dan', label: 'Hướng dẫn của phòng' },
  { key: 'ten_homestay', label: 'Tên homestay' },
  { key: 'dia_chi', label: 'Địa chỉ' },
  { key: 'ban_do', label: 'Link bản đồ' },
  { key: 'hotline', label: 'Hotline' },
  { key: 'wifi', label: 'Tên wifi' },
  { key: 'mat_khau_wifi', label: 'Mật khẩu wifi' },
];

/** Ký tự đánh dấu chỗ {ma_cua} khi xem trước, để thay bằng chữ che (không bao giờ có trong nội dung gõ vào). */
const DOOR_CODE_MARK = '\u0000';

const DEFAULT_LABEL: Record<string, string> = {
  SELF: 'Khách tự check-in',
  STAFF: 'Nhân viên check-in',
};

/** Màn Cài đặt: mẫu tin nhắn gửi khách và thông tin homestay. Chỉ Quản lý sửa được. */
@Component({
  selector: 'app-settings-page',
  imports: [ReactiveFormsModule, ButtonModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly settingsService = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly bodyField = viewChild<ElementRef<HTMLTextAreaElement>>('bodyField');

  protected readonly variables = VARIABLES;
  protected readonly defaultLabel = DEFAULT_LABEL;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');

  protected readonly tab = signal<Tab>('mau-tin-nhan');
  protected readonly templates = signal<MessageTemplateDto[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly templateForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    body: new FormControl('', { nonNullable: true, validators: Validators.required }),
    defaultForCheckInMode: new FormControl<CheckInMode | null>(null),
  });

  protected readonly homestayForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    hotline: new FormControl('', { nonNullable: true, validators: Validators.required }),
    address: new FormControl('', { nonNullable: true, validators: Validators.required }),
    mapLink: new FormControl(''),
    wifiName: new FormControl(''),
    wifiPassword: new FormControl(''),
  });
  /** Thông tin homestay đã lưu, dùng cho phần xem trước. */
  private readonly homestay = signal<HomestayInfoDto | null>(null);
  protected readonly homestaySubmitting = signal(false);
  protected readonly homestayError = signal<string | null>(null);

  protected readonly sampleOrderCode = SAMPLE_ORDER_CODE;
  private readonly bodyValue = toSignal(this.templateForm.controls.body.valueChanges, {
    initialValue: this.templateForm.controls.body.value,
  });
  /**
   * Xem trước nội dung mẫu đang gõ với đơn mẫu + thông tin homestay hiện tại, tách thành các đoạn quanh chỗ
   * {ma_cua} (giao diện chèn chữ che vào giữa); null khi chưa có nội dung.
   */
  protected readonly previewParts = computed(() => {
    const body = this.bodyValue();
    const homestay = this.homestay();
    if (!body.trim() || !homestay) {
      return null;
    }
    return renderMessageTemplate(body, buildSampleMessageContext(homestay, DOOR_CODE_MARK)).split(DOOR_CODE_MARK);
  });

  constructor() {
    this.reloadTemplates();
    this.settingsService.getHomestay().subscribe((info) => this.fillHomestayForm(info));
  }

  private reloadTemplates(): void {
    this.settingsService.listTemplates().subscribe((list) => {
      this.templates.set(list);
      if (list.length > 0 && this.selectedId() === null) {
        this.selectTemplate(list[0]);
      }
    });
  }

  private fillHomestayForm(info: HomestayInfoDto): void {
    this.homestay.set(info);
    this.homestayForm.setValue({
      name: info.name,
      hotline: info.hotline,
      address: info.address,
      mapLink: info.mapLink ?? '',
      wifiName: info.wifiName ?? '',
      wifiPassword: info.wifiPassword ?? '',
    });
  }

  /** Mở mẫu đã có để sửa. */
  selectTemplate(template: MessageTemplateDto): void {
    this.errorMessage.set(null);
    this.selectedId.set(template.id);
    this.templateForm.setValue({
      name: template.name,
      body: template.body,
      defaultForCheckInMode: template.defaultForCheckInMode,
    });
  }

  /** Bắt đầu thêm mẫu mới (trống form). */
  newTemplate(): void {
    this.errorMessage.set(null);
    this.selectedId.set(null);
    this.templateForm.setValue({ name: '', body: '', defaultForCheckInMode: null });
  }

  /** Chèn một biến vào vị trí con trỏ trong ô nội dung. */
  insertVariable(key: string): void {
    const el = this.bodyField()?.nativeElement;
    const token = `{${key}}`;
    if (!el) {
      this.templateForm.controls.body.setValue(this.templateForm.controls.body.value + token);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + token + el.value.slice(end);
    this.templateForm.controls.body.setValue(next);
    queueMicrotask(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  /** Lưu mẫu (thêm mới hoặc sửa). */
  saveTemplate(): void {
    if (this.submitting() || rejectInvalid(this.errorMessage, this.templateForm)) {
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const id = this.selectedId();
    const request = this.templateForm.getRawValue();
    const save$ = id !== null
      ? this.settingsService.updateTemplate(id, request)
      : this.settingsService.createTemplate(request);
    save$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (saved) => {
        this.selectedId.set(saved.id);
        this.reloadTemplates();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không lưu được mẫu, thử lại sau.'),
    });
  }

  /** Xoá mẫu đang sửa. */
  deleteTemplate(): void {
    const id = this.selectedId();
    if (id === null || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.settingsService.deleteTemplate(id).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.templates.update((list) => list.filter((t) => t.id !== id));
        this.selectedId.set(null);
        const remaining = this.templates();
        if (remaining.length > 0) {
          this.selectTemplate(remaining[0]);
        } else {
          this.newTemplate();
        }
      },
      error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không xoá được mẫu, thử lại sau.'),
    });
  }

  /** Lưu thông tin homestay. */
  saveHomestay(): void {
    if (this.homestaySubmitting() || rejectInvalid(this.homestayError, this.homestayForm)) {
      return;
    }
    this.homestayError.set(null);
    this.homestaySubmitting.set(true);
    const raw = this.homestayForm.getRawValue();
    this.settingsService
      .updateHomestay({
        name: raw.name,
        hotline: raw.hotline,
        address: raw.address,
        mapLink: raw.mapLink || null,
        wifiName: raw.wifiName || null,
        wifiPassword: raw.wifiPassword || null,
      })
      .pipe(finalize(() => this.homestaySubmitting.set(false)))
      .subscribe({
        next: (info) => this.fillHomestayForm(info),
        error: (err) => this.homestayError.set(err?.error?.detail ?? 'Không lưu được thông tin, thử lại sau.'),
      });
  }
}
