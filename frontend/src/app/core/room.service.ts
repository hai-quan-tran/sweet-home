import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  PricingOverview,
  PricingOverviewUpdateRequest,
  RoomDto,
  RoomUpsertRequest,
} from './room.models';

const ROOMS_BASE = '/api/rooms';
const PRICING_BASE = '/api/room-types';

/** Gọi API phòng và bảng giá. */
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly http = inject(HttpClient);

  /** Dữ liệu tab Bảng giá (hạng phòng + khung giờ chung). */
  pricingOverview(): Observable<PricingOverview> {
    return this.http.get<PricingOverview>(`${PRICING_BASE}/overview`);
  }

  /** Lưu toàn bộ bảng giá (thêm/sửa/xoá hạng phòng và khung giờ chung) trong một lần. */
  savePricingOverview(request: PricingOverviewUpdateRequest): Observable<PricingOverview> {
    return this.http.put<PricingOverview>(`${PRICING_BASE}/overview`, request);
  }

  /** Danh sách phòng. */
  list(): Observable<RoomDto[]> {
    return this.http.get<RoomDto[]>(ROOMS_BASE);
  }

  /** Chi tiết một phòng. */
  get(id: number): Observable<RoomDto> {
    return this.http.get<RoomDto>(`${ROOMS_BASE}/${id}`);
  }

  /** Thêm phòng mới. */
  create(request: RoomUpsertRequest): Observable<RoomDto> {
    return this.http.post<RoomDto>(ROOMS_BASE, request);
  }

  /** Sửa thông tin phòng. */
  update(id: number, request: RoomUpsertRequest): Observable<RoomDto> {
    return this.http.put<RoomDto>(`${ROOMS_BASE}/${id}`, request);
  }

  /** Bật/tắt nhận đặt phòng. */
  setAcceptingBookings(id: number, accepting: boolean): Observable<RoomDto> {
    return this.http.patch<RoomDto>(`${ROOMS_BASE}/${id}/accepting-bookings`, { acceptingBookings: accepting });
  }

  /** Thêm ảnh vào phòng. */
  addPhotos(id: number, files: File[]): Observable<RoomDto> {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return this.http.post<RoomDto>(`${ROOMS_BASE}/${id}/photos`, form);
  }

  /** Xoá một ảnh của phòng. */
  deletePhoto(roomId: number, photoId: number): Observable<RoomDto> {
    return this.http.delete<RoomDto>(`${ROOMS_BASE}/${roomId}/photos/${photoId}`);
  }
}
