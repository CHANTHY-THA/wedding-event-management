import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Guest, SeatingTable } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  findTables,
  seatingWarnings,
  seatsFor,
  tableLoads,
  unseatedParties,
} from '../../shared/utils/seating';
import { TableFormDialog } from './table-form-dialog';

@Component({
  selector: 'app-seating-page',
  imports: [
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    FormsModule,
    NgTemplateOutlet,
    TranslatePipe,
    TableFormDialog,
  ],
  templateUrl: './seating-page.html',
  styleUrl: './seating-page.scss',
})
export class SeatingPage {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  protected readonly coupleNames = this.data.coupleNames;
  protected readonly tables = this.data.tables;
  protected readonly unseated = computed(() => unseatedParties(this.data.guests()));
  protected readonly loads = computed(() => tableLoads(this.data.tables(), this.data.guests()));
  protected readonly warnings = computed(() => seatingWarnings(this.loads()));
  protected readonly warningTableIds = computed(
    () => new Set(this.warnings().map((warning) => warning.tableId)),
  );
  protected readonly seatedGuests = computed(() =>
    this.loads().reduce((total, load) => total + load.used, 0),
  );
  protected readonly expectedGuests = computed(() =>
    this.data.guests().reduce((total, guest) => total + seatsFor(guest), 0),
  );
  protected readonly totalSeats = computed(() =>
    this.data.tables().reduce((total, table) => total + table.capacity, 0),
  );

  protected readonly lookupTerm = signal('');
  protected readonly lookupResults = computed(() =>
    findTables(this.data.guests(), this.data.tables(), this.lookupTerm()),
  );

  protected readonly isFormOpen = signal(false);
  /** The table being edited, or null when adding a new one. */
  protected readonly editingTable = signal<SeatingTable | null>(null);

  protected readonly seatsFor = seatsFor;

  /**
   * Shared by the "not seated" list (data: null) and every table (data: its id). The CDK types
   * each list's data separately, so the shared handler takes `any` and narrows it here.
   */
  protected drop(event: CdkDragDrop<any, any, Guest>): void {
    if (event.previousContainer !== event.container) {
      this.seat(event.item.data, event.container.data as number | null);
    }
  }

  /** Keyboard-friendly alternative to dragging: pick a table from the party's menu. */
  protected moveFromSelect(guest: Guest, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.seat(guest, target.value ? Number(target.value) : null);
    }
  }

  protected percent(used: number, capacity: number): number {
    return capacity ? Math.min(100, Math.round((used / capacity) * 100)) : 0;
  }

  protected openForm(table: SeatingTable | null): void {
    this.editingTable.set(table);
    this.isFormOpen.set(true);
  }

  protected printCards(): void {
    this.document.defaultView?.print();
  }

  private seat(guest: Guest, tableId: number | null): void {
    this.data.seatGuest(guest.id, tableId);
    const table = this.data.tables().find((entry) => entry.id === tableId);
    this.toast.show(
      table ? `${guest.name} seated at ${table.name}` : `${guest.name} moved to not seated`,
      table ? 'success' : 'info',
    );
  }
}
