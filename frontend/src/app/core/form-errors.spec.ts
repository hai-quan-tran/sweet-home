import { signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { REQUIRED_FIELDS_MESSAGE, rejectInvalid } from './form-errors';

describe('rejectInvalid', () => {
  afterEach(() => document.body.replaceChildren());

  it('form hợp lệ thì cho lưu, không đổi thông báo', () => {
    const error = signal<string | null>(null);
    const form = new FormGroup({ name: new FormControl('Vy', Validators.required) });

    expect(rejectInvalid(error, form)).toBe(false);
    expect(error()).toBeNull();
    expect(form.touched).toBe(false);
  });

  it('còn ô thiếu thì chặn lưu, đánh dấu đã chạm mọi form, hiện thông báo chung', () => {
    const error = signal<string | null>(null);
    const a = new FormGroup({ name: new FormControl('', Validators.required) });
    const b = new FormGroup({ phone: new FormControl('0900') });

    expect(rejectInvalid(error, a, b)).toBe(true);
    expect(error()).toBe(REQUIRED_FIELDS_MESSAGE);
    expect(a.controls.name.touched).toBe(true);
    expect(b.controls.phone.touched).toBe(true);
  });

  it('đưa con trỏ tới ô lỗi đầu tiên', async () => {
    const valid = Object.assign(document.createElement('input'), { className: 'inp ng-valid ng-touched' });
    const invalid = Object.assign(document.createElement('input'), { className: 'inp ng-invalid ng-touched' });
    document.body.append(valid, invalid);

    rejectInvalid(signal<string | null>(null), new FormControl('', Validators.required));
    await new Promise((resolve) => setTimeout(resolve));

    expect(document.activeElement).toBe(invalid);
  });
});
