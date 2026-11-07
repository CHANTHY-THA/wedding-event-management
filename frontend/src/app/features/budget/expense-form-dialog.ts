import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { BudgetExpense, NewBudgetExpense } from '../../core/wedding.models';
import { BUDGET_CATEGORIES, isValidExpense } from '../../shared/utils/budget';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type TextField = 'name' | 'category' | 'dueDate' | 'notes';
type AmountField = 'estimated' | 'paid';

/** Add a new budget item, or edit/delete an existing one when `expense` is set. */
@Component({
  selector: 'app-expense-form-dialog',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './expense-form-dialog.html',
})
export class ExpenseFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly expense = input<BudgetExpense | null>(null);
  readonly closed = output<void>();

  protected readonly categories = BUDGET_CATEGORIES;
  protected readonly vendors = this.data.vendors;
  protected readonly isEditing = computed(() => this.expense() !== null);
  protected readonly confirmingDelete = signal(false);
  protected readonly draft = linkedSignal<NewBudgetExpense>(() => {
    const expense = this.expense();
    if (expense) {
      const { id: _id, ...details } = expense;
      return details;
    }
    return {
      name: '',
      vendorId: null,
      category: BUDGET_CATEGORIES[0],
      estimated: 0,
      paid: 0,
      dueDate: '',
      notes: '',
    };
  });
  protected readonly isValid = computed(() => isValidExpense(this.draft()));

  protected updateText(field: TextField, event: Event): void {
    const target = event.target;
    if (!(
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    )) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected updateAmount(field: AmountField, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const amount = target.value === '' ? 0 : Number(target.value);
    this.draft.update((draft) => ({ ...draft, [field]: amount }));
  }

  protected updateVendor(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    const vendorId = target.value ? Number(target.value) : null;
    this.draft.update((draft) => ({ ...draft, vendorId }));
  }

  protected markFullyPaid(): void {
    this.draft.update((draft) => ({ ...draft, paid: draft.estimated }));
  }

  protected submit(): void {
    const draft = this.draft();
    const details: NewBudgetExpense = {
      ...draft,
      name: draft.name.trim(),
      notes: draft.notes.trim(),
    };
    if (!isValidExpense(details)) {
      return;
    }

    const expense = this.expense();
    if (expense) {
      this.data.updateExpense({ ...details, id: expense.id });
      this.toast.show(`${details.name} saved`);
    } else {
      this.data.addExpense(details);
      this.toast.show(`${details.name} added to the budget`);
    }
    this.closed.emit();
  }

  protected delete(): void {
    const expense = this.expense();
    if (!expense) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.data.removeExpense(expense.id);
    this.toast.show(`${expense.name} removed from the budget`, 'info');
    this.closed.emit();
  }
}
