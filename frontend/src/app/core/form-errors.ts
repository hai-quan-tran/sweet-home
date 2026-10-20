import { WritableSignal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/** Thông báo chung khi bấm lưu mà còn ô bắt buộc chưa nhập / chưa hợp lệ (ô đó có viền đỏ, xem styles.scss). */
export const REQUIRED_FIELDS_MESSAGE = 'Vui lòng nhập đủ các ô bắt buộc (viền đỏ).';

/**
 * Chặn lưu khi form còn ô chưa hợp lệ: đánh dấu đã chạm để các ô đó hiện viền đỏ, hiện thông báo chung
 * và đưa con trỏ tới ô lỗi đầu tiên (tự cuộn tới nếu đang khuất).
 *
 * @param error    signal thông báo lỗi của form
 * @param controls các form/control cần kiểm tra
 * @returns true nếu còn ô chưa hợp lệ (không được lưu)
 */
export function rejectInvalid(error: WritableSignal<string | null>, ...controls: AbstractControl[]): boolean {
  if (!controls.some((c) => c.invalid)) {
    return false;
  }
  controls.forEach((c) => c.markAllAsTouched());
  error.set(REQUIRED_FIELDS_MESSAGE);
  // Lớp ng-touched chỉ gắn lên ô sau lần cập nhật giao diện kế tiếp.
  setTimeout(() => document.querySelector<HTMLElement>(':is(.inp, .sel).ng-invalid.ng-touched')?.focus());
  return true;
}
