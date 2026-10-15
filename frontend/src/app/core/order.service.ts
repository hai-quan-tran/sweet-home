import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  DoorCodeResponse,
  ExtendPreviewResponse,
  ExtendRequest,
  OrderDto,
  OrderListResponse,
  CancelPreviewResponse,
  CancelRequest,
  CheckoutPreviewResponse,
  CheckoutRequest,
  OrderPaymentRequest,
  OrderPreviewRequest,
  OrderPreviewResponse,
  OrderStatus,
  OrderStayDto,
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

  /** Các chặng giao với khoảng [from, to), giờ dạng "2026-10-07T00:00:00" — dùng vẽ lịch đặt phòng. */
  stays(from: string, to: string): Observable<OrderStayDto[]> {
    return this.http.get<OrderStayDto[]>(`${BASE}/stays`, { params: { from, to } });
  }

  /** Chi tiết một đơn. */
  get(id: number): Observable<OrderDto> {
    return this.http.get<OrderDto>(`${BASE}/${id}`);
  }

  /** Mã cửa đã giải mã của một đơn; `forMessage` khi lấy để sao chép tin nhắn (backend ghi nhật ký "đã gửi mã"). */
  doorCode(id: number, forMessage = false): Observable<DoorCodeResponse> {
    return this.http.get<DoorCodeResponse>(`${BASE}/${id}/door-code`, forMessage ? { params: { forMessage: true } } : {});
  }

  /** Xem trước giờ nhận/trả, phòng trống và tiền tạm tính. */
  preview(request: OrderPreviewRequest): Observable<OrderPreviewResponse> {
    return this.http.post<OrderPreviewResponse>(`${BASE}/preview`, request);
  }

  /** Tạo đơn thuê mới. */
  create(request: OrderUpsertRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(BASE, request);
  }

  /** Sửa đơn còn ở trạng thái Đã đặt. */
  update(id: number, request: OrderUpsertRequest): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${BASE}/${id}`, request);
  }

  /** Xác nhận khách đã nhận phòng. */
  checkIn(orderId: number): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${BASE}/${orderId}/check-in`, {});
  }

  /** Xem trước tiền khi trả phòng. */
  previewCheckout(orderId: number, request: CheckoutRequest): Observable<CheckoutPreviewResponse> {
    return this.http.post<CheckoutPreviewResponse>(`${BASE}/${orderId}/checkout/preview`, request);
  }

  /** Trả phòng. */
  checkout(orderId: number, request: CheckoutRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${BASE}/${orderId}/checkout`, request);
  }

  /** Xem trước gia hạn tại phòng đang ở. */
  previewExtend(orderId: number, request: ExtendRequest): Observable<ExtendPreviewResponse> {
    return this.http.post<ExtendPreviewResponse>(`${BASE}/${orderId}/extend/preview`, request);
  }

  /** Gia hạn tại phòng đang ở. */
  extend(orderId: number, request: ExtendRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${BASE}/${orderId}/extend`, request);
  }

  /** Mức hoàn cọc mặc định nếu huỷ ngay bây giờ. */
  previewCancel(orderId: number): Observable<CancelPreviewResponse> {
    return this.http.get<CancelPreviewResponse>(`${BASE}/${orderId}/cancel/preview`);
  }

  /** Huỷ đơn. */
  cancel(orderId: number, request: CancelRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${BASE}/${orderId}/cancel`, request);
  }

  /** Thu thêm một khoản tiền của đơn. */
  addPayment(orderId: number, request: OrderPaymentRequest): Observable<OrderDto> {
    return this.http.post<OrderDto>(`${BASE}/${orderId}/payments`, request);
  }

  /** Sửa một khoản đã thu (chỉ Quản lý). */
  updatePayment(orderId: number, paymentId: number, request: OrderPaymentRequest): Observable<OrderDto> {
    return this.http.put<OrderDto>(`${BASE}/${orderId}/payments/${paymentId}`, request);
  }

  /** Xoá một khoản đã thu (chỉ Quản lý). */
  deletePayment(orderId: number, paymentId: number): Observable<OrderDto> {
    return this.http.delete<OrderDto>(`${BASE}/${orderId}/payments/${paymentId}`);
  }
}
