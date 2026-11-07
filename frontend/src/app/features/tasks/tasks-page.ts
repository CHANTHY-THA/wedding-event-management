import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { WeddingTask } from '../../core/wedding.models';
import { daysUntil } from '../../shared/utils/dates';
import {
  TaskFilter,
  filterTasks,
  groupTasksByPhase,
  isTaskOverdue,
  relativeDue,
} from '../../shared/utils/tasks';
import { TaskFormDialog } from './task-form-dialog';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const DUE_SOON_DAYS = 7;

@Component({
  selector: 'app-tasks-page',
  imports: [TranslatePipe, DatePipe, FormsModule, TaskFormDialog],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
})
export class TasksPage {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly now = new Date();

  protected readonly totalCount = computed(() => this.data.tasks().length);
  protected readonly doneCount = computed(
    () => this.data.tasks().filter((task) => task.done).length,
  );
  protected readonly overdueCount = computed(
    () => this.data.tasks().filter((task) => isTaskOverdue(task, this.now)).length,
  );
  protected readonly dueSoonCount = computed(
    () =>
      this.data.tasks().filter((task) => {
        const days = daysUntil(task.dueDate, this.now);
        return !task.done && days >= 0 && days <= DUE_SOON_DAYS;
      }).length,
  );
  protected readonly progress = computed(() =>
    this.totalCount() ? Math.round((this.doneCount() / this.totalCount()) * 100) : 0,
  );
  protected readonly owners = computed(() =>
    [...new Set(this.data.tasks().map((task) => task.owner))].sort((left, right) =>
      left.localeCompare(right),
    ),
  );
  /** Open tasks per person, busiest first. */
  protected readonly workload = computed(() =>
    this.owners()
      .map((owner) => {
        const tasks = this.data.tasks().filter((task) => task.owner === owner);
        return { owner, open: tasks.filter((task) => !task.done).length, total: tasks.length };
      })
      .sort((left, right) => right.open - left.open || left.owner.localeCompare(right.owner)),
  );

  protected readonly statusOptions: { value: TaskFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'To do' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'done', label: 'Done' },
  ];
  protected readonly searchTerm = signal('');
  protected readonly ownerFilter = signal('all');
  protected readonly statusFilter = signal<TaskFilter>('all');
  protected readonly phases = computed(() =>
    groupTasksByPhase(
      filterTasks(
        this.data.tasks(),
        this.searchTerm(),
        this.ownerFilter(),
        this.statusFilter(),
        this.now,
      ),
      this.data.details.date,
    ),
  );

  protected readonly isFormOpen = signal(false);
  /** The task being edited, or null when adding a new one. */
  protected readonly editingTask = signal<WeddingTask | null>(null);

  protected isOverdue(task: WeddingTask): boolean {
    return isTaskOverdue(task, this.now);
  }

  protected dueLabel(task: WeddingTask): string {
    return task.done ? 'Done' : relativeDue(task.dueDate, this.now);
  }

  protected phaseDone(tasks: WeddingTask[]): number {
    return tasks.filter((task) => task.done).length;
  }

  protected toggleTask(task: WeddingTask): void {
    this.data.toggleTask(task.id);
    if (!task.done) {
      this.toast.show(`Nice! “${task.title}” is done`);
    }
  }

  protected showOwner(owner: string): void {
    this.ownerFilter.set(this.ownerFilter() === owner ? 'all' : owner);
  }

  protected openForm(task: WeddingTask | null): void {
    this.editingTask.set(task);
    this.isFormOpen.set(true);
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.ownerFilter.set('all');
    this.statusFilter.set('all');
  }
}
