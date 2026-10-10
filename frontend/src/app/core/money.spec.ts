import { formatMoney } from './money';

describe('formatMoney', () => {
  it('định dạng số tiền kiểu "150.000đ"', () => {
    expect(formatMoney(150000)).toBe('150.000đ');
  });

  it('số 0 vẫn hiện "0đ"', () => {
    expect(formatMoney(0)).toBe('0đ');
  });

  it('null/undefined hiện gạch ngang', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });
});
