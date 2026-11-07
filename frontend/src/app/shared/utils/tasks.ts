import { WeddingTask } from '../../core/wedding.models';
import { daysUntil } from './dates';

export type TaskFilter = 'all' | 'open' | 'overdue' | 'done';

export interface TaskPhase {
  label: string;
  tasks: WeddingTask[];
}

/** Planning phases, from the earliest; `minDays` is the fewest days before the wedding. */
const PHASES: { label: string; minDays: number }[] = [
  { label: '12+ months before', minDays: 365 },
  { label: '6–12 months before', minDays: 180 },
  { label: '3–6 months before', minDays: 90 },
  { label: '1–3 months before', minDays: 30 },
  { label: 'Final month', minDays: 7 },
  { label: 'Wedding week', minDays: 0 },
  { label: 'After the wedding', minDays: -Infinity },
];

/** Shortcuts for deadlines relative to the wedding day, as used in planning checklists. */
export const DEADLINE_PRESETS: { label: string; months?: number; days?: number }[] = [
  { label: '12 months before', months: 12 },
  { label: '6 months before', months: 6 },
  { label: '3 months before', months: 3 },
  { label: '1 month before', months: 1 },
  { label: '2 weeks before', days: 14 },
  { label: '1 week before', days: 7 },
  { label: 'Day before', days: 1 },
  { label: 'Week after', days: -7 },
];

/** Whole days from one ISO date (yyyy-mm-dd) to another; negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const [year, month, day] = from.split('-').map(Number);
  return daysUntil(to, new Date(year, month - 1, day));
}

export function taskPhase(dueDate: string, weddingDate: string): string {
  const daysBefore = daysBetween(dueDate, weddingDate);
  return PHASES.find((phase) => daysBefore >= phase.minDays)!.label;
}

/** Tasks grouped by planning phase in chronological order, skipping empty phases. */
export function groupTasksByPhase(tasks: WeddingTask[], weddingDate: string): TaskPhase[] {
  const sorted = [...tasks].sort(
    (left, right) => left.dueDate.localeCompare(right.dueDate) || left.id - right.id,
  );
  return PHASES.map((phase) => ({
    label: phase.label,
    tasks: sorted.filter((task) => taskPhase(task.dueDate, weddingDate) === phase.label),
  })).filter((phase) => phase.tasks.length > 0);
}

/** ISO date for a preset such as "6 months before" the wedding day. */
export function presetDate(weddingDate: string, preset: (typeof DEADLINE_PRESETS)[number]): string {
  const [year, month, day] = weddingDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 - (preset.months ?? 0), day - (preset.days ?? 0)));
  return date.toISOString().slice(0, 10);
}

export function isTaskOverdue(task: WeddingTask, now: Date): boolean {
  return !task.done && daysUntil(task.dueDate, now) < 0;
}

/** Friendly deadline text such as "Due tomorrow" or "3 days overdue". */
export function relativeDue(dueDate: string, now: Date): string {
  const days = daysUntil(dueDate, now);
  if (days === 0) {
    return 'Due today';
  }
  if (days === 1) {
    return 'Due tomorrow';
  }
  if (days > 1) {
    return days < 60 ? `Due in ${days} days` : `Due in ${Math.round(days / 30)} months`;
  }
  return days === -1 ? '1 day overdue' : `${-days} days overdue`;
}

export function filterTasks(
  tasks: WeddingTask[],
  searchTerm: string,
  owner: string,
  status: TaskFilter,
  now: Date,
): WeddingTask[] {
  const query = searchTerm.trim().toLowerCase();

  return tasks.filter((task) => {
    const matchesQuery =
      !query ||
      task.title.toLowerCase().includes(query) ||
      task.owner.toLowerCase().includes(query) ||
      task.notes.toLowerCase().includes(query);
    const matchesOwner = owner === 'all' || task.owner === owner;
    const matchesStatus =
      status === 'all' ||
      (status === 'done' && task.done) ||
      (status === 'open' && !task.done) ||
      (status === 'overdue' && isTaskOverdue(task, now));

    return matchesQuery && matchesOwner && matchesStatus;
  });
}
