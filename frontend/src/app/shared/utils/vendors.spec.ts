import { BudgetExpense, ScheduleItem, Vendor } from '../../core/wedding.models';
import { filterVendors, summarizeVendor } from './vendors';

const vendor = (id: number, overrides: Partial<Vendor> = {}): Vendor => ({
  id,
  name: `Vendor ${id}`,
  service: 'Flowers',
  contactPerson: '',
  phone: '',
  email: '',
  contractStatus: 'Signed',
  notes: '',
  ...overrides,
});

const expense = (vendorId: number | null, estimated: number, paid: number): BudgetExpense => ({
  id: Math.random(),
  name: 'Item',
  vendorId,
  category: 'Other',
  estimated,
  paid,
  dueDate: '',
  notes: '',
});

const event = (id: number, vendorIds: number[], time: string): ScheduleItem => ({
  id,
  title: `Event ${id}`,
  type: 'Ceremony',
  date: '2026-10-24',
  time,
  endTime: '23:00',
  location: '',
  responsible: '',
  vendorIds,
});

describe('vendor utils', () => {
  it('sums linked budget items and lists linked events in time order', () => {
    const summary = summarizeVendor(
      vendor(1),
      [expense(1, 1000, 400), expense(1, 500, 500), expense(2, 900, 0)],
      [event(1, [1], '18:00'), event(2, [2], '09:00'), event(3, [1, 2], '09:00')],
    );
    expect(summary).toMatchObject({ estimated: 1500, paid: 900, due: 600 });
    expect(summary.paymentStatus).toBe('Partly paid');
    expect(summary.events.map((entry) => entry.id)).toEqual([3, 1]);
  });

  it('has no payment status without budget items', () => {
    expect(summarizeVendor(vendor(1), [], []).paymentStatus).toBeNull();
  });

  it('filters by contract status and search', () => {
    const vendors = [vendor(1, { contractStatus: 'Sent' }), vendor(2, { name: 'Bloom House' })];
    expect(filterVendors(vendors, '', 'Sent').map((entry) => entry.id)).toEqual([1]);
    expect(filterVendors(vendors, 'bloom', 'all').map((entry) => entry.id)).toEqual([2]);
  });
});
