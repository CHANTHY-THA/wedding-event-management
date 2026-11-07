import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Vendor } from '../../core/wedding.models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import {
  CONTRACT_STATUSES,
  VendorFilter,
  filterVendors,
  summarizeVendor,
} from '../../shared/utils/vendors';
import { VendorFormDialog } from './vendor-form-dialog';

@Component({
  selector: 'app-vendors-page',
  imports: [FormsModule, MoneyPipe, TranslatePipe, VendorFormDialog],
  templateUrl: './vendors-page.html',
  styleUrl: './vendors-page.scss',
})
export class VendorsPage {
  private readonly data = inject(WeddingDataService);

  private readonly summaries = computed(() =>
    this.data
      .vendors()
      .map((vendor) => summarizeVendor(vendor, this.data.expenses(), this.data.schedule())),
  );
  protected readonly vendorCount = computed(() => this.data.vendors().length);
  protected readonly signedCount = computed(
    () => this.data.vendors().filter((vendor) => vendor.contractStatus === 'Signed').length,
  );
  protected readonly committed = computed(() =>
    this.summaries().reduce((total, summary) => total + summary.estimated, 0),
  );
  protected readonly due = computed(() =>
    this.summaries().reduce((total, summary) => total + summary.due, 0),
  );

  protected readonly filterOptions: { value: VendorFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    ...CONTRACT_STATUSES.map((status) => ({ value: status, label: status })),
  ];
  protected readonly searchTerm = signal('');
  protected readonly filter = signal<VendorFilter>('all');
  protected readonly visibleSummaries = computed(() => {
    const visible = new Set(
      filterVendors(this.data.vendors(), this.searchTerm(), this.filter()).map(
        (vendor) => vendor.id,
      ),
    );
    return this.summaries()
      .filter((summary) => visible.has(summary.vendor.id))
      .sort((left, right) => left.vendor.name.localeCompare(right.vendor.name));
  });

  protected readonly isFormOpen = signal(false);
  /** The vendor being edited, or null when adding a new one. */
  protected readonly editingVendor = signal<Vendor | null>(null);

  protected percent(part: number, whole: number): number {
    return whole ? Math.min(100, Math.round((part / whole) * 100)) : 0;
  }

  protected statusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-');
  }

  protected openForm(vendor: Vendor | null): void {
    this.editingVendor.set(vendor);
    this.isFormOpen.set(true);
  }
}
