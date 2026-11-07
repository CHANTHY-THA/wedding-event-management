import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { BudgetExpense } from '../../core/wedding.models';
import {
  BUDGET_CATEGORIES,
  PaymentFilter,
  amountDue,
  filterExpenses,
  paymentStatus,
} from '../../shared/utils/budget';
import { daysUntil } from '../../shared/utils/dates';
import { ExpenseFormDialog } from './expense-form-dialog';

const MAX_UPCOMING_PAYMENTS = 5;
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-budget-page',
  imports: [TranslatePipe, DatePipe, MoneyPipe, FormsModule, ExpenseFormDialog],
  templateUrl: './budget-page.html',
  styleUrl: './budget-page.scss',
})
export class BudgetPage {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly now = new Date();

  protected readonly budgetTotal = this.data.budgetTotal;
  protected readonly budgetPlanned = this.data.budgetPlanned;
  protected readonly budgetSpent = this.data.budgetSpent;
  protected readonly budgetDue = this.data.budgetDue;
  protected readonly budgetCategories = this.data.budgetCategories;
  protected readonly overBudgetBy = computed(() =>
    Math.max(0, this.budgetPlanned() - this.budgetTotal()),
  );
  protected readonly unallocated = computed(() =>
    Math.max(0, this.budgetTotal() - this.budgetPlanned()),
  );
  protected readonly upcoming = computed(() =>
    this.data.upcomingPayments().slice(0, MAX_UPCOMING_PAYMENTS),
  );

  protected readonly categoryOptions = BUDGET_CATEGORIES;
  protected readonly statusOptions: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Unpaid', label: 'Unpaid' },
    { value: 'Partly paid', label: 'Partly paid' },
    { value: 'Paid', label: 'Paid' },
  ];
  protected readonly searchTerm = signal('');
  protected readonly categoryFilter = signal('all');
  protected readonly statusFilter = signal<PaymentFilter>('all');
  protected readonly filteredExpenses = computed(() =>
    filterExpenses(
      this.data.expenses(),
      this.searchTerm(),
      this.categoryFilter(),
      this.statusFilter(),
      (vendorId) => this.vendorName(vendorId),
    ).sort(
      (left, right) =>
        BUDGET_CATEGORIES.indexOf(left.category) - BUDGET_CATEGORIES.indexOf(right.category) ||
        left.name.localeCompare(right.name),
    ),
  );
  protected readonly expenseCount = computed(() => this.data.expenses().length);

  protected readonly isEditingTotal = signal(false);
  protected readonly totalDraft = signal(0);

  protected readonly isFormOpen = signal(false);
  /** The item being edited, or null when adding a new one. */
  protected readonly editingExpense = signal<BudgetExpense | null>(null);

  protected readonly paymentStatus = paymentStatus;
  protected readonly amountDue = amountDue;

  protected vendorName(vendorId: number | null): string {
    return this.data.findVendor(vendorId)?.name ?? '';
  }

  protected isOverdue(expense: BudgetExpense): boolean {
    return (
      expense.dueDate !== '' && amountDue(expense) > 0 && daysUntil(expense.dueDate, this.now) < 0
    );
  }

  protected percent(part: number, whole: number): number {
    return whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
  }

  protected startEditingTotal(): void {
    this.totalDraft.set(this.budgetTotal());
    this.isEditingTotal.set(true);
  }

  protected saveTotal(): void {
    const total = Number(this.totalDraft());
    if (total !== this.budgetTotal() && Number.isFinite(total) && total >= 0) {
      this.data.setBudgetTotal(total);
      this.toast.show('Total budget updated');
    }
    this.isEditingTotal.set(false);
  }

  protected openForm(expense: BudgetExpense | null): void {
    this.editingExpense.set(expense);
    this.isFormOpen.set(true);
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('all');
    this.statusFilter.set('all');
  }
}
