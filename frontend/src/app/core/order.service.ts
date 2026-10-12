import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DoorCodeResponse,
  OrderDto,
  OrderListResponse,
  OrderPreviewRequest,
  OrderPreviewResponse,
  OrderStatus,
  OrderUpsertRequest,
} from './order.models';

const BASE = '/api/orders';

/** Bộ lọc danh sách đơn thuê. */
export interface OrderListQuery {
  status?: OrderStatus;
  roomId?: number;
  search?: string;
  page?: number;
  size?: number;
}

/** Gọi API đơn thuê. */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);

  /** Danh sách đơn có lọc/tìm kiếm/phân trang. */
  list(query: OrderListQuery): Observable<OrderListResponse> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.roomId) params = params.set('roomId', query.roomId);
    if (query.search) params = params.set('search', query.search);
    params = params.set('page', query.page ?? 0).set('size', query.size ?? 10);
    return this.http.get<OrderListResponse>(BASE, { params });
  }

  /** Chi tiết một đơn. */
  get(id: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${BASE}/${id}`);
  }

  /** Mã cửa đã giải mã của một đơn. */
  doorCode(id: number): Observable<DoorCodeResponse> {
    return this.http.get<DoorCodeResponse>(`${BASE}/${id}/door-code`);
  }

  /** Xem trước giờ nhận/trả, phòng trống và tiền tạm tính. */
  preview(request: OrderPreviewRequest): Observable<OrderPreviewResponse> {
    return this.http.post<OrderPreviewResponse>(`${BASE}/preview`, request);
  }

  /** Tạo đơn thuê mới. */
  create(request: OrderUpsertRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(BASE, request);
  }
}
