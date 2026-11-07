import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { WeddingEventRecord } from '../../core/wedding.models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface ChartBar {
  label: string;
  amount: number;
  color: string;
}

@Component({
  selector: 'app-event-dashboard-page',
  imports: [DatePipe, DecimalPipe, MoneyPipe, RouterLink, TranslatePipe],
  templateUrl: './event-dashboard-page.html',
})
export class EventDashboardPage {
  private readonly data = inject(WeddingDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);

  protected readonly session = this.auth.session;
  protected readonly event = this.data.activeEvent;
  protected readonly invitedCount = this.data.invitedCount;
  protected readonly confirmedCount = this.data.confirmedCount;
  protected readonly pendingCount = this.data.pendingCount;
  protected readonly declinedCount = this.data.declinedCount;
  protected readonly expenses = this.data.expenses;
  protected readonly budgetTotal = this.data.budgetTotal;
  protected readonly guests = this.data.guests;
  protected readonly gifts = this.data.gifts;
  protected readonly currency = this.locale.currency;
  protected readonly exchangeRate = this.locale.khrPerUsd;

  protected readonly giftIncomeUsd = computed(() =>
    this.gifts()
      .filter((gift) => gift.type === 'Cash')
      .reduce(
        (total, gift) =>
          total + (gift.currency === 'USD' ? gift.amount : gift.amount / this.exchangeRate()),
        0,
      ),
  );
  protected readonly expenseSpent = computed(() =>
    this.expenses().reduce((total, expense) => total + expense.paid, 0),
  );
  protected readonly expensePlanned = computed(() =>
    this.expenses().reduce((total, expense) => total + expense.estimated, 0),
  );
  protected readonly profitLoss = computed(() => this.giftIncomeUsd() - this.expenseSpent());
  protected readonly expensePercent = computed(() =>
    this.expensePlanned()
      ? Math.min(100, Math.round((this.expenseSpent() / this.expensePlanned()) * 100))
      : 0,
  );
  protected readonly confirmedPercent = computed(() =>
    this.invitedCount()
      ? Math.round((this.confirmedCount() / this.invitedCount()) * 100)
      : 0,
  );
  protected readonly pendingPercent = computed(() =>
    this.invitedCount() ? Math.round((this.pendingCount() / this.invitedCount()) * 100) : 0,
  );
  protected readonly declinedPercent = computed(() =>
    Math.max(0, 100 - this.confirmedPercent() - this.pendingPercent()),
  );
  protected readonly guestStatusBackground = computed(
    () =>
      `conic-gradient(#56b889 0% ${this.confirmedPercent()}%, #efa83d ${this.confirmedPercent()}% ${this.confirmedPercent() + this.pendingPercent()}%, #df514c ${this.confirmedPercent() + this.pendingPercent()}% 100%)`,
  );

  protected readonly expenseCategories = computed(() => {
    const categories = new Map<string, number>();
    for (const expense of this.expenses()) {
      categories.set(expense.category, (categories.get(expense.category) ?? 0) + expense.paid);
    }
    return [...categories.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((left, right) => right.amount - left.amount);
  });
  protected readonly categoryBackground = computed(() => {
    const categories = this.expenseCategories();
    const total = categories.reduce((sum, category) => sum + category.amount, 0);
    if (!total) {
      return '#e8e8ec';
    }
    const colors = ['#56b889', '#efa83d', '#df514c', '#4395b8', '#8661df', '#ec7a9b'];
    let position = 0;
    const stops = categories.map((category, index) => {
      const start = position;
      position += (category.amount / total) * 100;
      return `${colors[index % colors.length]} ${start}% ${position}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  });

  protected readonly financialBars = computed<ChartBar[]>(() => [
    { label: 'Gift Income', amount: this.giftIncomeUsd(), color: '#56b889' },
    { label: 'Planned Expenses', amount: this.expensePlanned(), color: '#efa83d' },
    { label: 'Total Expenses (Actual)', amount: this.expenseSpent(), color: '#df514c' },
    { label: 'Profit and loss', amount: this.profitLoss(), color: '#4395b8' },
  ]);
  protected readonly maxFinancialBar = computed(() =>
    Math.max(1, ...this.financialBars().map((bar) => Math.abs(bar.amount))),
  );
  protected readonly totalCashGifts = computed(
    () => this.gifts().filter((gift) => gift.type === 'Cash').length,
  );
  protected readonly totalGiftItems = computed(
    () => this.gifts().filter((gift) => gift.type === 'Gift').length,
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('eventId');
    const currentEvent = this.event();
    if (id && currentEvent?.id !== id) {
      const activated = this.data.activateEvent(id);
      if (!activated) {
        this.toast.show('Event not found or archived.', 'danger');
        void this.router.navigateByUrl('/events');
      }
    }
  }

  protected progressWidth(amount: number): number {
    return Math.max(0, Math.min(100, (Math.abs(amount) / this.maxFinancialBar()) * 100));
  }

  protected eventDate(event: WeddingEventRecord | null): string {
    return event?.details.date ?? '';
  }
}
