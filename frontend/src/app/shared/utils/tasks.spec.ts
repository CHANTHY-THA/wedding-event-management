import { WeddingTask } from '../../core/wedding.models';
import {
  DEADLINE_PRESETS,
  filterTasks,
  groupTasksByPhase,
  presetDate,
  relativeDue,
  taskPhase,
} from './tasks';

const WEDDING = '2026-10-24';
const NOW = new Date(2026, 9, 22);

const task = (id: number, dueDate: string, done = false, owner = 'Dara'): WeddingTask => ({
  id,
  title: `Task ${id}`,
  owner,
  dueDate,
  done,
  notes: '',
});

describe('task utils', () => {
  it('places a due date in its planning phase', () => {
    expect(taskPhase('2025-09-01', WEDDING)).toBe('12+ months before');
    expect(taskPhase('2026-04-24', WEDDING)).toBe('6–12 months before');
    expect(taskPhase('2026-09-24', WEDDING)).toBe('1–3 months before');
    expect(taskPhase('2026-10-01', WEDDING)).toBe('Final month');
    expect(taskPhase('2026-10-24', WEDDING)).toBe('Wedding week');
    expect(taskPhase('2026-10-25', WEDDING)).toBe('After the wedding');
  });

  it('groups tasks by phase in date order', () => {
    const phases = groupTasksByPhase(
      [task(1, '2026-10-30'), task(2, '2026-10-23'), task(3, '2026-10-20')],
      WEDDING,
    );
    expect(phases.map((phase) => [phase.label, phase.tasks.map((entry) => entry.id)])).toEqual([
      ['Wedding week', [3, 2]],
      ['After the wedding', [1]],
    ]);
  });

  it('turns a preset into a date relative to the wedding', () => {
    const preset = (label: string) => DEADLINE_PRESETS.find((entry) => entry.label === label)!;
    expect(presetDate(WEDDING, preset('6 months before'))).toBe('2026-04-24');
    expect(presetDate(WEDDING, preset('Day before'))).toBe('2026-10-23');
    expect(presetDate(WEDDING, preset('Week after'))).toBe('2026-10-31');
  });

  it('describes deadlines relative to today', () => {
    expect(relativeDue('2026-10-22', NOW)).toBe('Due today');
    expect(relativeDue('2026-10-23', NOW)).toBe('Due tomorrow');
    expect(relativeDue('2026-10-20', NOW)).toBe('2 days overdue');
  });

  it('filters by owner and status', () => {
    const tasks = [
      task(1, '2026-10-01'),
      task(2, '2026-10-01', true),
      task(3, '2026-11-01', false, 'Sophea'),
    ];
    expect(filterTasks(tasks, '', 'all', 'overdue', NOW).map((entry) => entry.id)).toEqual([1]);
    expect(filterTasks(tasks, '', 'Sophea', 'open', NOW).map((entry) => entry.id)).toEqual([3]);
    expect(filterTasks(tasks, '', 'all', 'done', NOW).map((entry) => entry.id)).toEqual([2]);
  });
});
