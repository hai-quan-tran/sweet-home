const FORMATTER = new Intl.NumberFormat('vi-VN');

/** Định dạng số tiền VND kiểu "150.000đ". Trả "—" nếu chưa có giá trị. */
export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${FORMATTER.format(value)}đ`;
}
