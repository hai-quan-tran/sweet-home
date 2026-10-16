import { dm, durationLabel, hm, minutesBetween, timeOf } from './time-format';

describe('time-format', () => {
  it('giờ, ngày và giờ kèm ngày khi khác ngày', () => {
    expect(hm('2026-10-07T12:15:00')).toBe('12:15');
    expect(dm('2026-10-07T12:15:00')).toBe('07/10');
    expect(timeOf('2026-10-07T12:15:00', '2026-10-07T20:00:00')).toBe('12:15');
    expect(timeOf('2026-10-09T22:30:00', '2026-10-07T20:00:00')).toBe('09/10 22:30');
  });

  it('số phút và thời lượng', () => {
    expect(minutesBetween('2026-10-07T12:15:00', '2026-10-07T12:40:00')).toBe(25);
    expect(durationLabel(-5)).toBe('0 phút');
    expect(durationLabel(50)).toBe('50 phút');
    expect(durationLabel(130)).toBe('2 giờ 10 phút');
    expect(durationLabel(120)).toBe('2 giờ');
    expect(durationLabel(60 * 50)).toBe('2 ngày');
  });
});
