import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes, withComponentInputBinding())] });
  });

  /** Mở một đường dẫn và trả về tiêu đề h1 của màn. */
  async function titleOf(url: string): Promise<string | undefined> {
    const harness = await RouterTestingHarness.create(url);
    return harness.routeNativeElement?.querySelector('h1')?.textContent ?? undefined;
  }

  it('trang gốc chuyển tới Tổng quan', async () => {
    expect(await titleOf('/')).toBe('Tổng quan');
  });

  it('đường dẫn không tồn tại chuyển về Tổng quan', async () => {
    expect(await titleOf('/khong-co')).toBe('Tổng quan');
  });

  it('mỗi màn hiện đúng tiêu đề', async () => {
    expect(await titleOf('/don-thue/tao-moi')).toBe('Tạo đơn thuê');
  });
});
