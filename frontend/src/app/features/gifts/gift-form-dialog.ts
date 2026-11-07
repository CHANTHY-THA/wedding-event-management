import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Currency, GiftRecord, GiftType, NewGiftRecord } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { isValidGift } from '../../shared/utils/gifts';

type TextField = 'giverName' | 'item' | 'receivedAt' | 'recordedBy' | 'notes';

/** Record a new gift or cash envelope, or edit/delete one when `gift` is set. */
@Component({
  selector: 'app-gift-form-dialog',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './gift-form-dialog.html',
})
export class GiftFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly gift = input<GiftRecord | null>(null);
  readonly closed = output<void>();

  protected readonly guests = computed(() =>
    [...this.data.guests()].sort((left, right) => left.name.localeCompare(right.name)),
  );
  protected readonly isEditing = computed(() => this.gift() !== null);
  protected readonly confirmingDelete = signal(false);
  protected readonly draft = linkedSignal<NewGiftRecord>(() => {
    const gift = this.gift();
    if (gift) {
      const { id: _id, ...details } = gift;
      return details;
    }
    return {
      guestId: null,
      giverName: '',
      type: 'Cash',
      amount: 0,
      currency: 'USD',
      item: '',
      receivedAt: new Date().toISOString().slice(0, 10),
      recordedBy: this.auth.session()?.name ?? '',
      thanked: false,
      notes: '',
    };
  });
  protected readonly isValid = computed(() => isValidGift(this.draft()));

  protected selectGuest(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    const guestId = target.value ? Number(target.value) : null;
    const guest = this.data.guests().find((entry) => entry.id === guestId);
    this.draft.update((draft) => ({
      ...draft,
      guestId,
      giverName: guest ? guest.name : draft.guestId === null ? draft.giverName : '',
    }));
  }

  protected setType(type: GiftType): void {
    this.draft.update((draft) => ({ ...draft, type }));
  }

  protected setCurrency(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      this.draft.update((draft) => ({ ...draft, currency: target.value as Currency }));
    }
  }

  protected updateText(field: TextField, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected updateAmount(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.draft.update((draft) => ({ ...draft, amount: Number(target.value) || 0 }));
    }
  }

  protected toggleThanked(): void {
    this.draft.update((draft) => ({ ...draft, thanked: !draft.thanked }));
  }

  protected submit(): void {
    const draft = this.draft();
    const details: NewGiftRecord = {
      ...draft,
      giverName: draft.giverName.trim(),
      amount: draft.type === 'Cash' ? draft.amount : 0,
      item: draft.type === 'Gift' ? draft.item.trim() : '',
      recordedBy: draft.recordedBy.trim(),
      notes: draft.notes.trim(),
    };
    if (!isValidGift(details)) {
      return;
    }

    const gift = this.gift();
    if (gift) {
      this.data.updateGift({ ...details, id: gift.id });
      this.toast.show(`Gift from ${details.giverName} updated`);
    } else {
      this.data.addGift(details);
      this.toast.show(`Gift from ${details.giverName} recorded`);
    }
    this.closed.emit();
  }

  protected delete(): void {
    const gift = this.gift();
    if (!gift) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.data.removeGift(gift.id);
    this.toast.show(`Gift from ${gift.giverName} removed`, 'info');
    this.closed.emit();
  }
}
