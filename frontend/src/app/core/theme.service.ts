import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/** Class gắn lên thẻ html khi bật dark mode, khớp với darkModeSelector của PrimeNG. */
export const DARK_CLASS = 'app-dark';
const STORAGE_KEY = 'sh-theme';

/**
 * Quản lý giao diện sáng/tối. Chỉ lưu lựa chọn giao diện vào localStorage (không chứa dữ liệu nhạy cảm).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly isDark = signal(false);

  /** Đang ở dark mode hay không. */
  readonly dark = this.isDark.asReadonly();

  constructor() {
    this.apply(this.initial());
  }

  /** Đổi giữa sáng và tối, ghi nhớ lựa chọn. */
  toggle(): void {
    this.apply(!this.isDark());
    try {
      localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    } catch {
      // Trình duyệt chặn lưu: chỉ đổi trong phiên hiện tại
    }
  }

  /** Lựa chọn đã lưu, nếu chưa có thì theo cài đặt của hệ điều hành. */
  private initial(): boolean {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return saved === 'dark';
      }
    } catch {
      // Không đọc được: dùng cài đặt hệ điều hành
    }
    return this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  /** Gắn hoặc gỡ class dark trên thẻ html. */
  private apply(dark: boolean): void {
    this.isDark.set(dark);
    this.doc.documentElement.classList.toggle(DARK_CLASS, dark);
  }
}
