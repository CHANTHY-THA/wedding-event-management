import { ScheduleItem } from '../../core/wedding.models';
import { groupScheduleByDay } from './schedule';

const item = (id: number, date: string, time: string): ScheduleItem => ({
  id,
  title: `Event ${id}`,
  type: 'Ceremony',
  date,
  time,
  endTime: '23:59',
  location: '',
  responsible: '',
});

describe('groupScheduleByDay', () => {
  it('groups items by date in chronological order', () => {
    const days = groupScheduleByDay([
      item(1, '2026-10-25', '09:00'),
      item(2, '2026-10-24', '18:00'),
      item(3, '2026-10-24', '09:00'),
    ]);
    expect(days.map((day) => [day.date, day.items.map((entry) => entry.id)])).toEqual([
      ['2026-10-24', [3, 2]],
      ['2026-10-25', [1]],
    ]);
  });
});
