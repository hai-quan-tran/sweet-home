import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AccountDto, AccountUpsertRequest } from './account.models';

const BASE = '/api/accounts';

/** Gọi API tài khoản nhân viên. */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  /** Danh sách tài khoản. */
  list(): Observable<AccountDto[]> {
    return this.http.get<AccountDto[]>(BASE);
  }

  /** Chi tiết một tài khoản. */
  get(id: number): Observable<AccountDto> {
    return this.http.get<AccountDto>(`${BASE}/${id}`);
  }

  /** Thêm tài khoản (Quản lý). */
  create(request: AccountUpsertRequest): Observable<AccountDto> {
    return this.http.post<AccountDto>(BASE, request);
  }

  /** Sửa tài khoản (Quản lý). */
  update(id: number, request: AccountUpsertRequest): Observable<AccountDto> {
    return this.http.put<AccountDto>(`${BASE}/${id}`, request);
  }
}
