import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ActivityLogPage, ActivityPeriod } from './activity-log.models';

const BASE = '/api/activity-logs';

/**
 * Thời điểm bắt đầu của khoảng lọc, dạng giờ địa phương "YYYY-MM-DDT00:00:00": hôm nay, 7 ngày
 * (gồm hôm nay), hoặc từ đầu tháng này.
 */
export function periodStart(period: ActivityPeriod, now = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    start.setDate(start.getDate() - 6);
  } else if (period === 'month') {
    start.setDate(1);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T00:00:00`;
}

/** Gọi API nhật ký thao tác (chỉ Quản lý). */
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly http = inject(HttpClient);

  /** Một trang nhật ký trong khoảng thời gian, lọc theo người (tên đăng nhập) nếu có. */
  search(period: ActivityPeriod, actor: string | null, page: number): Observable<ActivityLogPage> {
    let params = new HttpParams().set('from', periodStart(period)).set('page', page);
    if (actor) {
      params = params.set('actor', actor);
    }
    return this.http.get<ActivityLogPage>(BASE, { params });
  }
}
