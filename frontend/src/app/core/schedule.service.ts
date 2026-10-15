import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CopyWeekResult, ShiftTemplateDto, ShiftTemplateRequest, WorkShiftDto, WorkShiftRequest } from './schedule.models';

const TEMPLATES = '/api/shift-templates';
const SHIFTS = '/api/shifts';

/** Gọi API Lịch làm: ca mẫu và ca đã xếp. */
@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly http = inject(HttpClient);

  /** Danh sách ca mẫu. */
  listTemplates(): Observable<ShiftTemplateDto[]> {
    return this.http.get<ShiftTemplateDto[]>(TEMPLATES);
  }

  /** Thêm ca mẫu. */
  createTemplate(request: ShiftTemplateRequest): Observable<ShiftTemplateDto> {
    return this.http.post<ShiftTemplateDto>(TEMPLATES, request);
  }

  /** Sửa ca mẫu. */
  updateTemplate(id: number, request: ShiftTemplateRequest): Observable<ShiftTemplateDto> {
    return this.http.put<ShiftTemplateDto>(`${TEMPLATES}/${id}`, request);
  }

  /** Xoá ca mẫu. */
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${TEMPLATES}/${id}`);
  }

  /** Các ca có ngày trong khoảng [from, to) ("YYYY-MM-DD"). */
  listShifts(from: string, to: string): Observable<WorkShiftDto[]> {
    return this.http.get<WorkShiftDto[]>(SHIFTS, { params: { from, to } });
  }

  /** Xếp một ca. */
  createShift(request: WorkShiftRequest): Observable<WorkShiftDto> {
    return this.http.post<WorkShiftDto>(SHIFTS, request);
  }

  /** Sửa một ca. */
  updateShift(id: number, request: WorkShiftRequest): Observable<WorkShiftDto> {
    return this.http.put<WorkShiftDto>(`${SHIFTS}/${id}`, request);
  }

  /** Xoá một ca. */
  deleteShift(id: number): Observable<void> {
    return this.http.delete<void>(`${SHIFTS}/${id}`);
  }

  /** Sao chép ca tuần trước sang tuần bắt đầu `weekStart` (thứ Hai, "YYYY-MM-DD"). */
  copyWeek(weekStart: string): Observable<CopyWeekResult> {
    return this.http.post<CopyWeekResult>(`${SHIFTS}/copy-week`, { weekStart });
  }
}
