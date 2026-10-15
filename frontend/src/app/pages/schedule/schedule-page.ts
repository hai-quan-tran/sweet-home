import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, finalize } from 'rxjs';

import { AccountDto } from '../../core/account.models';
import { AccountService } from '../../core/account.service';
import { AuthService } from '../../core/auth.service';
import { ShiftTemplateDto, WorkShiftDto } from '../../core/schedule.models';
import { ScheduleService } from '../../core/schedule.service';
import { initials } from '../staff/staff-permissions';

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
/** Tên màu ca mẫu (màu 1–6 định nghĩa ở schedule-page.scss: .s1 … .s6). */
export const COLOR_NAMES = ['Xanh dương', 'Xanh ngọc', 'Tím', 'Cam', 'Hồng', 'Xanh lá'];

/** Ca đang sửa (shift có giá trị) hoặc đang thêm cho một người, một ngày. */
interface Editing {
  shift: WorkShiftDto | null;
  accountId: number;
  date: string;
}

/** "YYYY-MM-DD" theo giờ máy. */
export function dayIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Thứ Hai của tuần chứa ngày d (0 giờ). */
export function mondayOf(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
}

/** Số giờ của một ca (giờ dạng "YYYY-MM-DDTHH:mm:ss", không múi giờ). */
export function shiftHours(s: WorkShiftDto): number {
  return (new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 3_600_000;
}

/**
 * Màn Lịch làm: bảng ca theo tuần (người × ngày), sửa ca đang chọn, quản lý ca mẫu, sao chép tuần trước.
 * Nhân viên chỉ xem. Ca lưu bản sao giờ nên sửa ca mẫu không đổi các ca đã xếp.
 */
@Component({
  selector: 'app-schedule-page',
  imports: [ReactiveFormsModule],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.scss',
})
export class SchedulePage {
  private readonly scheduleService = inject(ScheduleService);
  private readonly accountService = inject(AccountService);
  private readonly auth = inject(AuthService);

  protected readonly initials = initials;
  protected readonly colorNames = COLOR_NAMES;
  protected readonly isManager = computed(() => this.auth.currentUser()?.role === 'MANAGER');
  protected readonly weekStart = signal(mondayOf(new Date()));
  protected readonly accounts = signal<AccountDto[]>([]);
  protected readonly templates = signal<ShiftTemplateDto[]>([]);
  protected readonly shifts = signal<WorkShiftDto[]>([]);
  protected readonly editing = signal<Editing | null>(null);
  protected readonly editingTemplateId = signal<number | 'new' | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** 7 ngày của tuần đang xem. */
  protected readonly days = computed(() => {
    const today = dayIso(new Date());
    return WEEKDAY_LABELS.map((label, i) => {
      const d = new Date(this.weekStart());
      d.setDate(d.getDate() + i);
      const iso = dayIso(d);
      return { iso, label, dayMonth: iso.slice(8, 10) + '/' + iso.slice(5, 7), today: iso === today };
    });
  });
  protected readonly weekLabel = computed(() => {
    const d = this.days();
    return `${d[0].dayMonth} – ${d[6].dayMonth}/${d[6].iso.slice(0, 4)}`;
  });

  protected readonly shiftForm = new FormGroup({
    templateId: new FormControl<number | null>(null),
    startTime: new FormControl('', { nonNullable: true, validators: Validators.required }),
    endTime: new FormControl('', { nonNullable: true, validators: Validators.required }),
    note: new FormControl('', { nonNullable: true }),
  });
  protected readonly templateForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: Validators.required }),
    startTime: new FormControl('', { nonNullable: true, validators: Validators.required }),
    endTime: new FormControl('', { nonNullable: true, validators: Validators.required }),
    color: new FormControl(1, { nonNullable: true }),
  });

  private readonly shiftValue = toSignal(this.shiftForm.valueChanges, { initialValue: this.shiftForm.value });
  /** Ca mẫu đang chọn trong form sửa ca, kèm cờ giờ đã khác mẫu (hiện gợi ý "Đã sửa"). */
  protected readonly formTemplate = computed(() => {
    const v = this.shiftValue();
    const t = this.templates().find((x) => x.id === v.templateId);
    return t ? { template: t, changed: v.startTime !== hm(t.startTime) || v.endTime !== hm(t.endTime) } : null;
  });
  protected readonly editingAccount = computed(() => this.accounts().find((a) => a.id === this.editing()?.accountId) ?? null);

  constructor() {
    this.accountService.list().subscribe((list) => this.accounts.set(list.filter((a) => a.status === 'ACTIVE')));
    this.scheduleService.listTemplates().subscribe((list) => this.templates.set(list));
    this.loadShifts();
  }

  /** Tải ca của tuần đang xem. */
  loadShifts(): void {
    const days = this.days();
    const end = new Date(this.weekStart());
    end.setDate(end.getDate() + 7);
    this.scheduleService.listShifts(days[0].iso, dayIso(end)).subscribe((list) => this.shifts.set(list));
  }

  /** Lùi/tiến một tuần, hoặc về tuần này (step = 0). */
  moveWeek(step: number): void {
    const next = step === 0 ? mondayOf(new Date()) : new Date(this.weekStart());
    if (step !== 0) {
      next.setDate(next.getDate() + step * 7);
    }
    this.weekStart.set(next);
    this.editing.set(null);
    this.loadShifts();
  }

  /** Các ca của một người trong một ngày. */
  cellShifts(accountId: number, day: string): WorkShiftDto[] {
    return this.shifts().filter((s) => s.accountId === accountId && s.startAt.startsWith(day));
  }

  /** Tổng giờ trong tuần của một người, ví dụ "44 giờ" / "7,5 giờ". */
  totalHours(accountId: number): string {
    const total = this.shifts().filter((s) => s.accountId === accountId).reduce((sum, s) => sum + shiftHours(s), 0);
    return `${Math.round(total * 10) / 10} giờ`.replace('.', ',');
  }

  /** Ngày trước ngày bắt đầu làm: không xếp ca. */
  beforeStart(account: AccountDto, day: string): boolean {
    return account.startDate !== null && day < account.startDate;
  }

  /** "06:00:00" hoặc "...T06:00:00" → "06:00". */
  time(value: string): string {
    return hm(value.length > 8 ? value.slice(11) : value);
  }

  /** Mở form sửa một ca (chỉ Quản lý). */
  openShift(shift: WorkShiftDto): void {
    this.editing.set({ shift, accountId: shift.accountId, date: shift.startAt.slice(0, 10) });
    this.shiftForm.setValue({
      templateId: shift.templateId,
      startTime: this.time(shift.startAt),
      endTime: this.time(shift.endAt),
      note: shift.note ?? '',
    });
    this.error.set(null);
  }

  /** Mở form thêm ca cho một người, một ngày; mặc định theo ca mẫu đầu tiên. */
  openNew(accountId: number, date: string): void {
    const t = this.templates()[0];
    this.editing.set({ shift: null, accountId, date });
    this.shiftForm.setValue({ templateId: t?.id ?? null, startTime: t ? hm(t.startTime) : '', endTime: t ? hm(t.endTime) : '', note: '' });
    this.error.set(null);
  }

  /** Chọn ca mẫu khác trong form: điền giờ theo mẫu (ca lẻ giữ giờ đang nhập). */
  applyTemplate(): void {
    const t = this.templates().find((x) => x.id === this.shiftForm.controls.templateId.value);
    if (t) {
      this.shiftForm.patchValue({ startTime: hm(t.startTime), endTime: hm(t.endTime) });
    }
  }

  /** Lưu ca đang sửa/thêm. */
  saveShift(): void {
    const e = this.editing();
    if (!e || this.shiftForm.invalid || this.saving()) {
      this.shiftForm.markAllAsTouched();
      return;
    }
    const v = this.shiftForm.getRawValue();
    const request = { accountId: e.accountId, date: e.date, templateId: v.templateId, startTime: v.startTime, endTime: v.endTime, note: v.note.trim() || null };
    this.run(e.shift ? this.scheduleService.updateShift(e.shift.id, request) : this.scheduleService.createShift(request), () => {
      this.editing.set(null);
      this.loadShifts();
    });
  }

  /** Xoá ca đang sửa (hỏi lại). */
  deleteShift(): void {
    const shift = this.editing()?.shift;
    if (shift && confirm('Xoá ca này?')) {
      this.run(this.scheduleService.deleteShift(shift.id), () => {
        this.editing.set(null);
        this.loadShifts();
      });
    }
  }

  /** Sao chép ca tuần trước sang tuần đang xem (hỏi lại), báo số ca đã chép / bỏ qua. */
  copyPreviousWeek(): void {
    if (!confirm('Sao chép toàn bộ ca của tuần trước sang tuần này? Ca trùng giờ sẽ được bỏ qua.')) {
      return;
    }
    this.run(this.scheduleService.copyWeek(this.days()[0].iso), (r) => {
      this.info.set(`Đã chép ${r.copied} ca${r.skipped ? `, bỏ qua ${r.skipped} ca (trùng giờ, tài khoản khoá hoặc chưa tới ngày làm)` : ''}.`);
      this.loadShifts();
    });
  }

  /** Mở form ca mẫu: sửa một mẫu hoặc thêm mới (màu chưa dùng đầu tiên). */
  openTemplate(template: ShiftTemplateDto | null): void {
    this.editingTemplateId.set(template?.id ?? 'new');
    const used = new Set(this.templates().map((t) => t.color));
    this.templateForm.setValue(template
      ? { name: template.name, startTime: hm(template.startTime), endTime: hm(template.endTime), color: template.color }
      : { name: '', startTime: '', endTime: '', color: [1, 2, 3, 4, 5, 6].find((c) => !used.has(c)) ?? 1 });
    this.error.set(null);
  }

  /** Lưu ca mẫu đang mở. */
  saveTemplate(): void {
    const id = this.editingTemplateId();
    if (id === null || this.templateForm.invalid || this.saving()) {
      this.templateForm.markAllAsTouched();
      return;
    }
    const request = this.templateForm.getRawValue();
    this.run(id === 'new' ? this.scheduleService.createTemplate(request) : this.scheduleService.updateTemplate(id, request), () => {
      this.editingTemplateId.set(null);
      this.scheduleService.listTemplates().subscribe((list) => this.templates.set(list));
    });
  }

  /** Xoá ca mẫu đang mở (hỏi lại); ca đã xếp theo mẫu giữ nguyên. */
  deleteTemplate(): void {
    const id = this.editingTemplateId();
    if (typeof id === 'number' && confirm('Xoá ca mẫu này? Các ca đã xếp theo mẫu vẫn giữ nguyên.')) {
      this.run(this.scheduleService.deleteTemplate(id), () => {
        this.editingTemplateId.set(null);
        this.templates.update((list) => list.filter((t) => t.id !== id));
      });
    }
  }

  /** Gọi API ghi dữ liệu: khoá nút khi đang lưu, hiện lỗi từ backend. */
  private run<T>(request: Observable<T>, done: (result: T) => void): void {
    this.saving.set(true);
    this.error.set(null);
    this.info.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: done,
      error: (err) => this.error.set(err?.error?.detail ?? 'Không lưu được, thử lại sau.'),
    });
  }
}

/** "06:00:00" → "06:00". */
function hm(value: string): string {
  return value.slice(0, 5);
}
