import { BudgetExpense } from '../../core/wedding.models';
import { filterExpenses, paymentStatus, summarizeByCategory, upcomingPayments } from './budget';

const expense = (
  id: number,
  category: string,
  estimated: number,
  paid: number,
  dueDate = '',
): BudgetExpense => ({
  id,
  name: `Item ${id}`,
  vendorId: null,
  category,
  estimated,
  paid,
  dueDate,
  notes: '',
});

describe('budget utils', () => {
  it('derives the payment status from the amounts', () => {
    expect(paymentStatus({ estimated: 500, paid: 0 })).toBe('Unpaid');
    expect(paymentStatus({ estimated: 500, paid: 200 })).toBe('Partly paid');
    expect(paymentStatus({ estimated: 500, paid: 500 })).toBe('Paid');
  });

  it('totals expenses per category in the standard order', () => {
    const categories = summarizeByCategory([
      expense(1, 'Photo & video', 1000, 400),
      expense(2, 'Venue & catering', 5000, 5000),
      expense(3, 'Photo & video', 500, 100),
    ]);
    expect(categories).toEqual([
      { name: 'Venue & catering', spent: 5000, planned: 5000 },
      { name: 'Photo & video', spent: 500, planned: 1500 },
    ]);
  });

  it('lists unpaid items by due date with undated items last', () => {
    const upcoming = upcomingPayments([
      expense(1, 'Other', 100, 0),
      expense(2, 'Other', 100, 100, '2026-10-01'),
      expense(3, 'Other', 100, 50, '2026-11-01'),
      expense(4, 'Other', 100, 0, '2026-10-15'),
    ]);
    expect(upcoming.map((entry) => entry.id)).toEqual([4, 3, 1]);
  });

  it('filters by search, category and status', () => {
    const expenses = [
      { ...expense(1, 'Photo & video', 1000, 0), vendorId: 5 },
      expense(2, 'Photo & video', 1000, 1000),
      expense(3, 'Transport', 300, 0),
    ];
    const vendorName = (id: number | null) => (id === 5 ? 'Lens & Light' : '');
    expect(
      filterExpenses(expenses, 'lens', 'all', 'all', vendorName).map((entry) => entry.id),
    ).toEqual([1]);
    expect(filterExpenses(expenses, '', 'Photo & video', 'Unpaid').map((e) => e.id)).toEqual([1]);
  });
});
