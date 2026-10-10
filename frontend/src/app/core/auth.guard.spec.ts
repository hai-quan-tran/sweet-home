import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { authGuard, authenticatedGuard, guestGuard, managerGuard } from './auth.guard';
import { AccountSummary } from './auth.models';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const manager: AccountSummary = { id: 1, username: 'm1', fullName: 'Quản lý', role: 'MANAGER', mustChangePassword: false };
  const staff: AccountSummary = { id: 3, username: 's2', fullName: 'Nhân viên 2', role: 'STAFF', mustChangePassword: false };
  const mustChange: AccountSummary = { id: 2, username: 's1', fullName: 'Nhân viên', role: 'STAFF', mustChangePassword: true };

  function setup(user: AccountSummary | null, loadResult: AccountSummary | null = user) {
    const authStub = {
      currentUser: signal(user).asReadonly(),
      loadCurrentUser: () => of(loadResult),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    });
  }

  const fakeState = { url: '/phong' } as never;

  it('authGuard cho qua khi đã đăng nhập và không bị bắt đổi mật khẩu', () => {
    setup(manager);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, fakeState));
    expect(result).toBe(true);
  });

  it('authGuard chuyển về /doi-mat-khau khi mustChangePassword', () => {
    setup(mustChange);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, fakeState)) as UrlTree;
    expect(result.toString()).toBe('/doi-mat-khau');
  });

  it('authGuard chuyển về /dang-nhap kèm redirect khi chưa đăng nhập', () =>
    new Promise<void>((resolve) => {
      setup(null);
      const result = TestBed.runInInjectionContext(() => authGuard({} as never, fakeState)) as Observable<UrlTree>;
      result.subscribe((tree) => {
        expect(tree.toString()).toBe('/dang-nhap?redirect=%2Fphong');
        resolve();
      });
    }));

  it('authGuard tự nạp tài khoản khi currentUser chưa có sẵn (vào trực tiếp bằng URL)', () =>
    new Promise<void>((resolve) => {
      setup(null, manager);
      const result = TestBed.runInInjectionContext(() => authGuard({} as never, fakeState)) as Observable<boolean>;
      result.subscribe((value) => {
        expect(value).toBe(true);
        resolve();
      });
    }));

  it('authenticatedGuard cho qua dù đang mustChangePassword', () => {
    setup(mustChange);
    const result = TestBed.runInInjectionContext(() => authenticatedGuard({} as never, fakeState));
    expect(result).toBe(true);
  });

  it('guestGuard chuyển về /tong-quan khi đã đăng nhập', () => {
    setup(manager);
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never)) as UrlTree;
    expect(result.toString()).toBe('/tong-quan');
  });

  it('guestGuard cho qua khi chưa đăng nhập', () =>
    new Promise<void>((resolve) => {
      setup(null);
      const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never)) as Observable<boolean>;
      result.subscribe((value) => {
        expect(value).toBe(true);
        resolve();
      });
    }));

  it('managerGuard cho qua khi là Quản lý', () => {
    setup(manager);
    const result = TestBed.runInInjectionContext(() => managerGuard({} as never, fakeState));
    expect(result).toBe(true);
  });

  it('managerGuard chuyển về /phong khi là Nhân viên', () => {
    setup(staff);
    const result = TestBed.runInInjectionContext(() => managerGuard({} as never, fakeState)) as UrlTree;
    expect(result.toString()).toBe('/phong');
  });
});
