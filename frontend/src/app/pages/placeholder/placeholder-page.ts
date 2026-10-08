import { Component, input } from '@angular/core';

/**
 * Trang tạm cho các màn chưa làm. Tiêu đề lấy từ data của route.
 */
@Component({
  selector: 'app-placeholder-page',
  template: `
    <h1 class="page-title">{{ title() }}</h1>
    <p class="page-desc">Màn hình này sẽ được làm ở các giai đoạn sau.</p>
  `,
})
export class PlaceholderPage {
  /** Tiêu đề màn hình, nhận từ route data. */
  readonly title = input('');
}
