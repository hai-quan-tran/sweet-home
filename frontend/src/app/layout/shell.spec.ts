import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DARK_CLASS } from '../core/theme.service';
import { MENU } from './menu';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(async () => {
    localStorage.setItem('sh-theme', 'light');
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  /** Dựng shell và chờ render xong. */
  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('hiện đủ các mục menu theo thứ tự', async () => {
    const el = await render();
    const labels = Array.from(el.querySelectorAll('.nav a .label')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(MENU.map((m) => m.label));
  });

  it('có nút Tạo đơn thuê dẫn tới màn tạo đơn', async () => {
    const el = await render();
    const link = el.querySelector('.top a[href="/don-thue/tao-moi"]');
    expect(link?.textContent).toContain('Tạo đơn thuê');
  });

  it('bấm nút giao diện thì chuyển sang dark mode', async () => {
    const el = await render();
    const btn = el.querySelector<HTMLButtonElement>('button[aria-label="Chuyển sang giao diện tối"]');
    btn?.click();
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
  });
});
