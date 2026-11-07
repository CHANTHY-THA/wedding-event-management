import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { NewWeddingTask, WeddingTask } from '../../core/wedding.models';
import { DEADLINE_PRESETS, presetDate, taskPhase } from '../../shared/utils/tasks';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type TaskField = keyof NewWeddingTask;

/** Add a new task, or edit/delete an existing one when `task` is set. */
@Component({
  selector: 'app-task-form-dialog',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './task-form-dialog.html',
})
export class TaskFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly task = input<WeddingTask | null>(null);
  /** People who already own tasks, offered as suggestions. */
  readonly owners = input<string[]>([]);
  readonly closed = output<void>();

  protected readonly presets = DEADLINE_PRESETS.map((preset) => ({
    label: preset.label,
    date: presetDate(this.data.details.date, preset),
  }));
  protected readonly isEditing = computed(() => this.task() !== null);
  protected readonly confirmingDelete = signal(false);
  protected readonly draft = linkedSignal<NewWeddingTask>(() => {
    const task = this.task();
    if (task) {
      const { id: _id, done: _done, ...details } = task;
      return details;
    }
    return { title: '', owner: '', dueDate: this.presets[3].date, notes: '' };
  });
  protected readonly phase = computed(() =>
    this.draft().dueDate ? taskPhase(this.draft().dueDate, this.data.details.date) : '',
  );
  protected readonly isValid = computed(
    () => this.draft().title.trim() !== '' && this.draft().dueDate !== '',
  );

  protected updateField(field: TaskField, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected setDueDate(date: string): void {
    this.draft.update((draft) => ({ ...draft, dueDate: date }));
  }

  protected submit(): void {
    const draft = this.draft();
    const details: NewWeddingTask = {
      ...draft,
      title: draft.title.trim(),
      owner: draft.owner.trim() || 'Unassigned',
      notes: draft.notes.trim(),
    };
    if (!details.title || !details.dueDate) {
      return;
    }

    const task = this.task();
    if (task) {
      this.data.updateTask({ ...details, id: task.id, done: task.done });
      this.toast.show(`${details.title} updated`);
    } else {
      this.data.addTask(details);
      this.toast.show(`${details.title} added to the checklist`);
    }
    this.closed.emit();
  }

  protected delete(): void {
    const task = this.task();
    if (!task) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.data.removeTask(task.id);
    this.toast.show(`${task.title} removed from the checklist`, 'info');
    this.closed.emit();
  }
}
