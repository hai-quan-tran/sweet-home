import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  HomestayInfoDto,
  HomestayInfoUpdateRequest,
  MessageTemplateDto,
  MessageTemplateUpsertRequest,
} from './settings.models';

const HOMESTAY_BASE = '/api/settings/homestay';
const TEMPLATES_BASE = '/api/message-templates';

/** Gọi API Cài đặt: thông tin homestay và mẫu tin nhắn. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  /** Thông tin homestay hiện tại. */
  getHomestay(): Observable<HomestayInfoDto> {
    return this.http.get<HomestayInfoDto>(HOMESTAY_BASE);
  }

  /** Sửa thông tin homestay. */
  updateHomestay(request: HomestayInfoUpdateRequest): Observable<HomestayInfoDto> {
    return this.http.put<HomestayInfoDto>(HOMESTAY_BASE, request);
  }

  /** Danh sách mẫu tin nhắn. */
  listTemplates(): Observable<MessageTemplateDto[]> {
    return this.http.get<MessageTemplateDto[]>(TEMPLATES_BASE);
  }

  /** Thêm mẫu mới. */
  createTemplate(request: MessageTemplateUpsertRequest): Observable<MessageTemplateDto> {
    return this.http.post<MessageTemplateDto>(TEMPLATES_BASE, request);
  }

  /** Sửa mẫu. */
  updateTemplate(id: number, request: MessageTemplateUpsertRequest): Observable<MessageTemplateDto> {
    return this.http.put<MessageTemplateDto>(`${TEMPLATES_BASE}/${id}`, request);
  }

  /** Xoá mẫu. */
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${TEMPLATES_BASE}/${id}`);
  }
}
