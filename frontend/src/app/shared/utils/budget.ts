import {
  BudgetCategory,
  BudgetExpense,
  NewBudgetExpense,
  PaymentStatus,
} from '../../core/wedding.models';

export type PaymentFilter = 'all' | PaymentStatus;

export const BUDGET_CATEGORIES = [
  'Venue & catering',
  'Decoration & flowers',
  'Photo & video',
  'Attire & makeup',
  'Music & entertainment',
  'Stationery & gifts',
  'Transport',
  'Other',
];

export function paymentStatus(expense: Pick<BudgetExpense, 'estimated' | 'paid'>): PaymentStatus {
  if (expense.paid <= 0) {
    return 'Unpaid';
  }
  return expense.paid >= expense.estimated ? 'Paid' : 'Partly paid';
}

export function amountDue(expense: Pick<BudgetExpense, 'estimated' | 'paid'>): number {
  return Math.max(0, expense.estimated - expense.paid);
}

export function isValidExpense(expense: NewBudgetExpense): boolean {
  return (
    expense.name.trim() !== '' &&
    expense.category.trim() !== '' &&
    Number.isFinite(expense.estimated) &&
    expense.estimated > 0 &&
    Number.isFinite(expense.paid) &&
    expense.paid >= 0
  );
}

/** Totals per category, in the standard category order, skipping categories with no items. */
export function summarizeByCategory(expenses: BudgetExpense[]): BudgetCategory[] {
  const totals = new Map<string, BudgetCategory>();
  for (const expense of expenses) {
    const category = totals.get(expense.category) ?? {
      name: expense.category,
      spent: 0,
      planned: 0,
    };
    category.spent += expense.paid;
    category.planned += expense.estimated;
    totals.set(expense.category, category);
  }
  const order = (name: string) => {
    const index = BUDGET_CATEGORIES.indexOf(name);
    return index === -1 ? BUDGET_CATEGORIES.length : index;
  };
  return [...totals.values()].sort((left, right) => order(left.name) - order(right.name));
}

/** Items with money still owed, soonest due date first; items without a date go last. */
export function upcomingPayments(expenses: BudgetExpense[]): BudgetExpense[] {
  return expenses
    .filter((expense) => amountDue(expense) > 0)
    .sort((left, right) => {
      if (!left.dueDate || !right.dueDate) {
        return Number(!left.dueDate) - Number(!right.dueDate);
      }
      return left.dueDate.localeCompare(right.dueDate);
    });
}

export function filterExpenses(
  expenses: BudgetExpense[],
  searchTerm: string,
  category: string,
  status: PaymentFilter,
  vendorName: (vendorId: number | null) => string = () => '',
): BudgetExpense[] {
  const query = searchTerm.trim().toLowerCase();

  return expenses.filter((expense) => {
    const matchesQuery =
      !query ||
      expense.name.toLowerCase().includes(query) ||
      vendorName(expense.vendorId).toLowerCase().includes(query) ||
      expense.notes.toLowerCase().includes(query);
    const matchesCategory = category === 'all' || expense.category === category;
    const matchesStatus = status === 'all' || paymentStatus(expense) === status;

    return matchesQuery && matchesCategory && matchesStatus;
  });
}
