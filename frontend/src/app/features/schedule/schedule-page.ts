import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { WeddingDataService } from '../../core/wedding-data.service';
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
  protected readonly eventCount = computed(() => this.data.schedule().length);
  protected readonly scheduleDays = computed(() => groupScheduleByDay(this.data.schedule()));
}
