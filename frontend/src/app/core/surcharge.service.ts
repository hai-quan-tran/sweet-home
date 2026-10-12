import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SurchargeDto, SurchargeUpsertRequest } from './surcharge.models';

const BASE = '/api/surcharges';

/** Gọi API phụ thu. */
@Injectable({ providedIn: 'root' })
export class SurchargeService {
  private readonly http = inject(HttpClient);

  /** Danh sách phụ thu (gồm đã ẩn). */
  list(): Observable<SurchargeDto[]> {
    return this.http.get<SurchargeDto[]>(BASE);
  }

  /** Thêm phụ thu mới. */
  create(request: SurchargeUpsertRequest): Observable<SurchargeDto> {
    return this.http.post<SurchargeDto>(BASE, request);
  }

  /** Sửa phụ thu. */
  update(id: number, request: SurchargeUpsertRequest): Observable<SurchargeDto> {
    return this.http.put<SurchargeDto>(`${BASE}/${id}`, request);
  }

  /** Ẩn hoặc khôi phục một phụ thu. */
  setActive(id: number, active: boolean): Observable<SurchargeDto> {
    return this.http.patch<SurchargeDto>(`${BASE}/${id}/active`, { active });
  }
}
