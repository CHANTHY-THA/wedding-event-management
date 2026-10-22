import { daysUntil, timeAgo } from './dates';

describe('daysUntil', () => {
  it('counts calendar days regardless of the time of day', () => {
    expect(daysUntil('2026-10-24', new Date(2026, 9, 22, 23, 30))).toBe(2);
    expect(daysUntil('2026-10-24', new Date(2026, 9, 24, 8, 0))).toBe(0);
    expect(daysUntil('2026-10-24', new Date(2026, 9, 25))).toBe(-1);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-10-22T12:00:00Z');

  it('formats minutes, hours and days', () => {
    expect(timeAgo('2026-10-22T11:59:40Z', now)).toBe('just now');
    expect(timeAgo('2026-10-22T11:15:00Z', now)).toBe('45m ago');
    expect(timeAgo('2026-10-22T07:00:00Z', now)).toBe('5h ago');
    expect(timeAgo('2026-10-19T12:00:00Z', now)).toBe('3d ago');
  });
});
