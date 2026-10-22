import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WeddingDataService } from '../../core/wedding-data.service';
import { GuestFormDialog } from '../../shared/guest-form-dialog/guest-form-dialog';
import { daysUntil, timeAgo } from '../../shared/utils/dates';
import { groupScheduleByDay } from '../../shared/utils/schedule';

const MAX_LATEST_REPLIES = 5;

@Component({
  selector: 'app-overview-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, GuestFormDialog],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
})
export class OverviewPage {
  private readonly data = inject(WeddingDataService);
  private readonly now = new Date();

  protected readonly details = this.data.details;
  protected readonly coupleNames = this.data.coupleNames;
  protected readonly isGuestFormOpen = signal(false);

  protected readonly invitedCount = this.data.invitedCount;
  protected readonly confirmedCount = this.data.confirmedCount;
  protected readonly pendingCount = this.data.pendingCount;
  protected readonly declinedCount = this.data.declinedCount;
  protected readonly partyCount = computed(() => this.data.guests().length);
  protected readonly pendingPartyCount = computed(
    () => this.data.guests().filter((guest) => guest.rsvp === 'Pending').length,
  );

  protected readonly countdownLabel = computed(() => {
    const days = daysUntil(this.details.date, this.now);
    if (days > 1) {
      return `${days} days to go`;
    }
    return days === 1 ? 'Tomorrow!' : days === 0 ? 'Today!' : 'Just married';
  });

  protected readonly scheduleItems = computed(() =>
    groupScheduleByDay(this.data.schedule()).flatMap((day) => day.items),
  );

  protected readonly budgetTotal = this.data.budgetTotal;
  protected readonly budgetSpent = this.data.budgetSpent;
  protected readonly budgetCategories = this.data.budgetCategories;
  protected readonly nextPayment = this.data.nextPayment;

  protected readonly tasks = computed(() =>
    [...this.data.tasks()].sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
  );

  protected readonly latestReplies = computed(() =>
    this.data
      .latestReplies()
      .slice(0, MAX_LATEST_REPLIES)
      .map((guest) => ({ guest, ago: timeAgo(guest.respondedAt!, this.now) })),
  );

  protected percentOfInvited(count: number): number {
    const invited = this.invitedCount();
    return invited ? Math.round((count / invited) * 100) : 0;
  }

  protected percent(part: number, whole: number): number {
    return whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
  }

  protected toggleTask(id: number): void {
    this.data.toggleTask(id);
  }
}
