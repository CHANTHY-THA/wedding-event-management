import {
  BudgetExpense,
  ContractStatus,
  PaymentStatus,
  ScheduleItem,
  Vendor,
} from '../../core/wedding.models';
import { amountDue } from './budget';

export type VendorFilter = 'all' | ContractStatus;

export const CONTRACT_STATUSES: ContractStatus[] = ['Not started', 'Sent', 'Signed'];

export interface VendorSummary {
  vendor: Vendor;
  expenses: BudgetExpense[];
  events: ScheduleItem[];
  estimated: number;
  paid: number;
  due: number;
  /** Overall payment state across the vendor's budget items; null when none are linked. */
  paymentStatus: PaymentStatus | null;
}

export function summarizeVendor(
  vendor: Vendor,
  expenses: BudgetExpense[],
  schedule: ScheduleItem[],
): VendorSummary {
  const linked = expenses.filter((expense) => expense.vendorId === vendor.id);
  const estimated = linked.reduce((total, expense) => total + expense.estimated, 0);
  const paid = linked.reduce((total, expense) => total + expense.paid, 0);
  const due = linked.reduce((total, expense) => total + amountDue(expense), 0);
  return {
    vendor,
    expenses: linked,
    events: schedule
      .filter((item) => item.vendorIds.includes(vendor.id))
      .sort((left, right) =>
        `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
      ),
    estimated,
    paid,
    due,
    paymentStatus: !linked.length ? null : paid <= 0 ? 'Unpaid' : due > 0 ? 'Partly paid' : 'Paid',
  };
}

export function filterVendors(
  vendors: Vendor[],
  searchTerm: string,
  status: VendorFilter,
): Vendor[] {
  const query = searchTerm.trim().toLowerCase();

  return vendors.filter((vendor) => {
    const matchesQuery =
      !query ||
      vendor.name.toLowerCase().includes(query) ||
      vendor.service.toLowerCase().includes(query) ||
      vendor.contactPerson.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || vendor.contractStatus === status;

    return matchesQuery && matchesStatus;
  });
}
