import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeddingDataService } from '../../core/wedding-data.service';
import { NewScheduleItem } from '../../core/wedding.models';

const EMPTY_SCHEDULE_ITEM: NewScheduleItem = {
  title: '',
  type: 'Ceremony',
  date: '2026-10-24',
  time: '09:00',
  endTime: '10:00',
  location: '',
  responsible: '',
};

@Component({
  selector: 'app-schedule-form-dialog',
  imports: [FormsModule],
  templateUrl: './schedule-form-dialog.html',
})
export class ScheduleFormDialog {
  private readonly data = inject(WeddingDataService);

  readonly closed = output<void>();

  protected readonly draft = signal<NewScheduleItem>({ ...EMPTY_SCHEDULE_ITEM });

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
    this.data.addScheduleItem({ ...draft, title, location, responsible });
    this.closed.emit();
  }
}
