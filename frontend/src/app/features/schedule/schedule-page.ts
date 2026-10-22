import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { WeddingDataService } from '../../core/wedding-data.service';
import { ScheduleItem } from '../../core/wedding.models';
import { groupScheduleByDay } from '../../shared/utils/schedule';
import { ScheduleFormDialog } from './schedule-form-dialog';

@Component({
  selector: 'app-schedule-page',
  imports: [DatePipe, ScheduleFormDialog],
  templateUrl: './schedule-page.html',
  styleUrl: './schedule-page.scss',
})
export class SchedulePage {
  private readonly data = inject(WeddingDataService);

  protected readonly isFormOpen = signal(false);
  /** The item being edited, or null when adding a new one. */
  protected readonly editingItem = signal<ScheduleItem | null>(null);
  protected readonly eventCount = computed(() => this.data.schedule().length);
  protected readonly scheduleDays = computed(() => groupScheduleByDay(this.data.schedule()));

  protected openForm(item: ScheduleItem | null): void {
    this.editingItem.set(item);
    this.isFormOpen.set(true);
  }
}
