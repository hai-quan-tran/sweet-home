import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';

/**
 * Màn đăng nhập. Thành công thì chuyển tới màn đổi mật khẩu (nếu bắt đổi lần đầu)
 * hoặc màn được yêu cầu trước đó (query param redirect), mặc định về Tổng quan.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly theme = inject(ThemeService);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
    rememberDevice: new FormControl(false, { nonNullable: true }),
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  /** Đổi hiện/ẩn mật khẩu. */
  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  /** Gửi thông tin đăng nhập, điều hướng theo kết quả. */
  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (account) => {
          if (account.mustChangePassword) {
            this.router.navigateByUrl('/doi-mat-khau');
            return;
          }
          const redirect = this.route.snapshot.queryParamMap.get('redirect');
          this.router.navigateByUrl(redirect || '/tong-quan');
        },
        error: () => this.errorMessage.set('Tên đăng nhập hoặc mật khẩu không đúng.'),
      });
  }
}
