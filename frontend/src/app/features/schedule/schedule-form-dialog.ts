import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeddingDataService } from '../../core/wedding-data.service';
import { NewScheduleItem, ScheduleItem } from '../../core/wedding.models';

/** Add a new schedule item, or edit/delete an existing one when `item` is set. */
@Component({
  selector: 'app-schedule-form-dialog',
  imports: [FormsModule],
  templateUrl: './schedule-form-dialog.html',
})
export class ScheduleFormDialog {
  private readonly data = inject(WeddingDataService);

  readonly item = input<ScheduleItem | null>(null);
  readonly closed = output<void>();

  protected readonly isEditing = computed(() => this.item() !== null);
  protected readonly confirmingDelete = signal(false);
  protected readonly draft = linkedSignal<NewScheduleItem>(() => {
    const item = this.item();
    if (item) {
      const { id: _id, ...details } = item;
      return details;
    }
    return {
      title: '',
      type: 'Ceremony',
      date: this.data.details.date,
      time: '09:00',
      endTime: '10:00',
      location: '',
      responsible: '',
    };
  });

  protected updateField(field: keyof NewScheduleItem, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected submit(): void {
    const draft = this.draft();
    const title = draft.title.trim();
    const location = draft.location.trim();
    const responsible = draft.responsible.trim();
    if (!title || !draft.date || !draft.time || !draft.endTime || !location || !responsible) {
      return;
    }
    if (draft.endTime <= draft.time) {
      return;
    }

    const details = { ...draft, title, location, responsible };
    const item = this.item();
    if (item) {
      this.data.updateScheduleItem({ ...details, id: item.id });
    } else {
      this.data.addScheduleItem(details);
    }
    this.closed.emit();
  }

  protected delete(): void {
    const item = this.item();
    if (!item) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.data.removeScheduleItem(item.id);
    this.closed.emit();
  }
}
