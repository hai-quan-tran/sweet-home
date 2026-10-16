import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardDto } from './dashboard.models';

/** Gọi API màn Tổng quan. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  /** Số liệu Tổng quan hiện tại (doanh thu chỉ có với Quản lý). */
  overview(): Observable<DashboardDto> {
    return this.http.get<DashboardDto>('/api/dashboard');
  }
}
