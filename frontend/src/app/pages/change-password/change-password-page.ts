import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth.service';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/** Mật khẩu phải ≥ 8 ký tự, có cả chữ và số (khớp quy tắc backend). */
function passwordRuleValidator(control: AbstractControl): ValidationErrors | null {
  return PASSWORD_PATTERN.test(control.value ?? '') ? null : { passwordRule: true };
}

/** newPassword và confirmPassword phải giống nhau. */
function matchingPasswordsValidator(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { mismatch: true };
}

/**
 * Màn đổi mật khẩu. Bắt buộc ở lần đăng nhập đầu (mustChangePassword), cũng dùng để tự đổi sau đó.
 */
@Component({
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule],
  templateUrl: './change-password-page.html',
  styleUrl: './change-password-page.scss',
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Đang bị bắt đổi mật khẩu (lần đăng nhập đầu) hay tự chọn đổi. */
  protected readonly forced = computed(() => this.auth.currentUser()?.mustChangePassword ?? false);

  protected readonly form = new FormGroup(
    {
      oldPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
      newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, passwordRuleValidator] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: Validators.required }),
    },
    { validators: matchingPasswordsValidator },
  );

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Gửi đổi mật khẩu; thành công thì vào Tổng quan. */
  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    const { oldPassword, newPassword } = this.form.getRawValue();
    this.auth
      .changePassword({ oldPassword, newPassword })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/tong-quan'),
        error: (err) => this.errorMessage.set(err?.error?.detail ?? 'Không đổi được mật khẩu, thử lại sau.'),
      });
  }
}
