import { ScheduleDay, ScheduleItem } from '../../core/wedding.models';

/** Sorts items chronologically and groups them by date. */
export function groupScheduleByDay(items: ScheduleItem[]): ScheduleDay[] {
  const sorted = [...items].sort((left, right) =>
    `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
  );
  const days = new Map<string, ScheduleItem[]>();
  for (const item of sorted) {
    const day = days.get(item.date) ?? [];
    day.push(item);
    days.set(item.date, day);
  }
  return Array.from(days, ([date, dayItems]) => ({ date, items: dayItems }));
}
