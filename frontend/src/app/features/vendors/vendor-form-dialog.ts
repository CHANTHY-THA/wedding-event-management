import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { ContractStatus, NewVendor, Vendor } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { CONTRACT_STATUSES } from '../../shared/utils/vendors';

type TextField = 'name' | 'service' | 'contactPerson' | 'phone' | 'email' | 'notes';

/** Add a vendor, or edit/delete one when `vendor` is set. */
@Component({
  selector: 'app-vendor-form-dialog',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './vendor-form-dialog.html',
})
export class VendorFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly vendor = input<Vendor | null>(null);
  readonly closed = output<void>();

  protected readonly statuses = CONTRACT_STATUSES;
  protected readonly isEditing = computed(() => this.vendor() !== null);
  protected readonly confirmingDelete = signal(false);
  protected readonly draft = linkedSignal<NewVendor>(() => {
    const vendor = this.vendor();
    if (vendor) {
      const { id: _id, ...details } = vendor;
      return details;
    }
    return {
      name: '',
      service: '',
      contactPerson: '',
      phone: '',
      email: '',
      contractStatus: 'Not started',
      notes: '',
    };
  });
  protected readonly isValid = computed(
    () => this.draft().name.trim() !== '' && this.draft().service.trim() !== '',
  );

  protected updateText(field: TextField, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected setStatus(status: ContractStatus): void {
    this.draft.update((draft) => ({ ...draft, contractStatus: status }));
  }

  protected submit(): void {
    const draft = this.draft();
    const details: NewVendor = {
      ...draft,
      name: draft.name.trim(),
      service: draft.service.trim(),
      contactPerson: draft.contactPerson.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      notes: draft.notes.trim(),
    };
    if (!details.name || !details.service) {
      return;
    }

    const vendor = this.vendor();
    if (vendor) {
      this.data.updateVendor({ ...details, id: vendor.id });
      this.toast.show(`${details.name} updated`);
    } else {
      this.data.addVendor(details);
      this.toast.show(`${details.name} added to your vendors`);
    }
    this.closed.emit();
  }

  protected delete(): void {
    const vendor = this.vendor();
    if (!vendor) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.data.removeVendor(vendor.id);
    this.toast.show(`${vendor.name} removed from your vendors`, 'info');
    this.closed.emit();
  }
}
