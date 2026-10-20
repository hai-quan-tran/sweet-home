import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AccountDto, AccountUpsertRequest } from '../../core/account.models';
import { AccountService } from '../../core/account.service';
import { AccountRole } from '../../core/auth.models';
import { AuthService } from '../../core/auth.service';
import { rejectInvalid } from '../../core/form-errors';
import { STAFF_PERMISSIONS } from './staff-permissions';

/** Mật khẩu ≥ 8 ký tự, có chữ và số — cùng quy tắc với backend (PasswordPolicy). */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;

/** Sinh mật khẩu tạm ngẫu nhiên 10 ký tự, luôn có chữ và số; bỏ ký tự dễ nhầm (0/O, 1/l/I). */
export function randomPassword(): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const values = crypto.getRandomValues(new Uint32Array(10));
  const pick = (chars: string, i: number) => chars[values[i] % chars.length];
  let password = pick(letters, 0) + pick(digits, 1);
  for (let i = 2; i < values.length; i++) {
    password += pick(letters + digits, i);
  }
  return password;
}

/** Màn Thêm/Sửa nhân viên: dùng chung một form, phân biệt qua route param `id`. Chỉ Quản lý vào được. */
@Component({
  selector: 'app-staff-form-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './staff-form-page.html',
  styleUrls: ['../rooms/room-form-page.scss', './staff-form-page.scss'],
})
export class StaffFormPage {
  private readonly accountService = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly permissions = STAFF_PERMISSIONS;
  protected readonly accountId = signal<number | null>(this.parseId());
  protected readonly isEdit = computed(() => this.accountId() !== null);
  /** Quản lý đang sửa chính mình: không được tự khoá / tự đổi vai trò. */
  protected readonly isSelf = computed(() => this.accountId() === this.auth.currentUser()?.id);
  protected readonly idNumberMasked = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly loading = signal(true);

  protected readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: Validators.required }),
    phone: new FormControl('', { nonNullable: true, validators: Validators.required }),
    idNumber: new FormControl('', { nonNullable: true, validators: Validators.pattern(/^[0-9 ]*$/) }),
    startDate: new FormControl('', { nonNullable: true }),
    username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(USERNAME_PATTERN)] }),
    password: new FormControl('', { nonNullable: true, validators: Validators.pattern(PASSWORD_PATTERN) }),
    mustChangePassword: new FormControl(true, { nonNullable: true }),
    role: new FormControl<AccountRole>('STAFF', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
  });

  protected readonly role = toSignal(this.form.controls.role.valueChanges, { initialValue: this.form.controls.role.value });

  constructor() {
    const id = this.accountId();
    if (id === null) {
      this.form.controls.password.addValidators(Validators.required);
      this.loading.set(false);
      return;
    }
    this.form.controls.username.disable();
    if (this.isSelf()) {
      this.form.controls.role.disable();
      this.form.controls.active.disable();
    }
    this.accountService.get(id).subscribe((account) => {
      this.fillForm(account);
      this.loading.set(false);
    });
  }

  private parseId(): number | null {
    const raw = this.route.snapshot.paramMap.get('id');
    return raw ? Number(raw) : null;
  }

  private fillForm(account: AccountDto): void {
    this.idNumberMasked.set(account.idNumberMasked);
    this.form.patchValue({
      fullName: account.fullName,
      phone: account.phone ?? '',
      startDate: account.startDate ?? '',
      username: account.username,
      role: account.role,
      active: account.status === 'ACTIVE',
    });
  }

  /** Điền mật khẩu tạm ngẫu nhiên và hiện ra để Quản lý đọc/đưa cho nhân viên. */
  generatePassword(): void {
    this.form.controls.password.setValue(randomPassword());
    this.showPassword.set(true);
  }

  /** Lưu tài khoản (thêm mới hoặc sửa). */
  submit(): void {
    if (this.submitting() || rejectInvalid(this.errorMessage, this.form)) {
      return;
    }
    const raw = this.form.getRawValue();
    const request: AccountUpsertRequest = {
      fullName: raw.fullName,
      phone: raw.phone,
      idNumber: raw.idNumber || null,
      startDate: raw.startDate || null,
      username: raw.username,
      password: raw.password || null,
      mustChangePassword: raw.mustChangePassword,
      role: raw.role,
      active: raw.active,
    };
    this.errorMessage.set(null);
    this.submitting.set(true);
    const id = this.accountId();
    const save$ = id !== null ? this.accountService.update(id, request) : this.accountService.create(request);
    save$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => this.router.navigateByUrl('/nhan-vien'),
      error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không lưu được tài khoản, thử lại sau.'),
    });
  }
}
