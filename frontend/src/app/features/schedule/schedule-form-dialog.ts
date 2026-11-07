import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { NewScheduleItem, ScheduleItem } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

/** Add a new schedule item, or edit/delete an existing one when `item` is set. */
@Component({
  selector: 'app-schedule-form-dialog',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './schedule-form-dialog.html',
})
export class ScheduleFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly item = input<ScheduleItem | null>(null);
  readonly closed = output<void>();

  protected readonly vendors = this.data.vendors;
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
      vendorIds: [],
    };
  });

  protected updateField(field: keyof NewScheduleItem, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected toggleVendor(vendorId: number): void {
    this.draft.update((draft) => ({
      ...draft,
      vendorIds: draft.vendorIds.includes(vendorId)
        ? draft.vendorIds.filter((id) => id !== vendorId)
        : [...draft.vendorIds, vendorId],
    }));
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
      this.toast.show(`${title} updated`);
    } else {
      this.data.addScheduleItem(details);
      this.toast.show(`${title} added to the timeline`);
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
    this.toast.show(`${item.title} removed from the timeline`, 'info');
    this.closed.emit();
  }
}
