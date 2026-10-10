import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from './app.routes';
import { AccountSummary } from './core/auth.models';
import { AuthService } from './core/auth.service';

describe('Routing', () => {
  const loggedInManager: AccountSummary = {
    id: 1,
    username: 'manager1',
    fullName: 'Quản lý',
    role: 'MANAGER',
    mustChangePassword: false,
  };

  /** AuthService giả lập, để test route không cần gọi API thật. */
  function configureWithUser(user: AccountSummary | null): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: AuthService, useValue: { currentUser: signal(user).asReadonly(), loadCurrentUser: () => of(user) } },
      ],
    });
  }

  /** Mở một đường dẫn và trả về tiêu đề h1 của màn. */
  async function titleOf(url: string): Promise<string | undefined> {
    const harness = await RouterTestingHarness.create(url);
    return harness.routeNativeElement?.querySelector('h1')?.textContent ?? undefined;
  }

  beforeEach(() => configureWithUser(loggedInManager));

  it('trang gốc chuyển tới Tổng quan', async () => {
    expect(await titleOf('/')).toBe('Tổng quan');
  });

  it('đường dẫn không tồn tại chuyển về Tổng quan', async () => {
    expect(await titleOf('/khong-co')).toBe('Tổng quan');
  });

  it('mỗi màn hiện đúng tiêu đề', async () => {
    expect(await titleOf('/don-thue/tao-moi')).toBe('Tạo đơn thuê');
  });

  it('chưa đăng nhập thì vào màn sau đăng nhập đều bị đưa về Đăng nhập', async () => {
    TestBed.resetTestingModule();
    configureWithUser(null);
    await RouterTestingHarness.create('/tong-quan');
    expect(TestBed.inject(Router).url).toBe('/dang-nhap?redirect=%2Ftong-quan');
  });
});
