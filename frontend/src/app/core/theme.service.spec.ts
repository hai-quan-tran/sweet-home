import { TestBed } from '@angular/core/testing';
import { DARK_CLASS, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_CLASS);
  });

  /** Tạo service mới sau khi đã chuẩn bị localStorage. */
  function create(): ThemeService {
    return TestBed.inject(ThemeService);
  }

  it('dùng lựa chọn đã lưu khi khởi tạo', () => {
    localStorage.setItem('sh-theme', 'dark');
    const service = create();
    expect(service.dark()).toBe(true);
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
  });

  it('chưa lưu thì theo cài đặt hệ điều hành', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const service = create();
    expect(service.dark()).toBe(true);
  });

  it('toggle đổi giao diện và ghi nhớ', () => {
    localStorage.setItem('sh-theme', 'light');
    const service = create();
    service.toggle();
    expect(service.dark()).toBe(true);
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
    expect(localStorage.getItem('sh-theme')).toBe('dark');
    service.toggle();
    expect(service.dark()).toBe(false);
    expect(localStorage.getItem('sh-theme')).toBe('light');
  });
});
