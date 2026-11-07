import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { SeatingTable } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const MAX_CAPACITY = 30;

/** Add a seating table, or rename/resize/delete one when `table` is set. */
@Component({
  selector: 'app-table-form-dialog',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './table-form-dialog.html',
})
export class TableFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly table = input<SeatingTable | null>(null);
  readonly closed = output<void>();

  protected readonly maxCapacity = MAX_CAPACITY;
  protected readonly isEditing = computed(() => this.table() !== null);
  protected readonly confirmingDelete = signal(false);
  protected readonly name = linkedSignal(
    () => this.table()?.name ?? `Table ${this.data.tables().length + 1}`,
  );
  protected readonly capacity = linkedSignal(() => this.table()?.capacity ?? 8);
  protected readonly isValid = computed(
    () =>
      this.name().trim() !== '' &&
      Number.isInteger(this.capacity()) &&
      this.capacity() >= 1 &&
      this.capacity() <= MAX_CAPACITY,
  );

  protected submit(): void {
    if (!this.isValid()) {
      return;
    }
    const name = this.name().trim();
    const table = this.table();
    if (table) {
      this.data.updateTable({ ...table, name, capacity: this.capacity() });
      this.toast.show(`${name} updated`);
    } else {
      this.data.addTable(name, this.capacity());
      this.toast.show(`${name} added`);
    }
    this.closed.emit();
  }

  protected delete(): void {
    const table = this.table();
    if (!table) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.data.removeTable(table.id);
    this.toast.show(`${table.name} removed; its guests are back on the unseated list`, 'info');
    this.closed.emit();
  }
}
