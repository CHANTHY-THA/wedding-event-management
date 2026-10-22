import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeddingDataService } from '../../core/wedding-data.service';
import { NewGuest } from '../../core/wedding.models';
import { isValidParty } from '../utils/guests';

const EMPTY_GUEST: NewGuest = {
  name: '',
  group: '',
  partySize: 1,
  plusOnes: 0,
  children: 0,
  side: 'Shared',
  relationship: '',
  email: '',
  phone: '',
  tags: [],
};

const NUMERIC_FIELDS: ReadonlySet<keyof NewGuest> = new Set(['partySize', 'plusOnes', 'children']);

@Component({
  selector: 'app-guest-form-dialog',
  imports: [FormsModule],
  templateUrl: './guest-form-dialog.html',
})
export class GuestFormDialog {
  private readonly data = inject(WeddingDataService);

  readonly closed = output<void>();
  readonly added = output<void>();

  protected readonly draft = signal<NewGuest>({ ...EMPTY_GUEST });

  protected updateField(field: keyof NewGuest, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }
    const value = target.value;
    this.draft.update((draft) => ({
      ...draft,
      [field]: NUMERIC_FIELDS.has(field)
        ? Number(value)
        : field === 'tags'
          ? value
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : value,
    }));
  }

  protected submit(): void {
    const draft = this.draft();
    const name = draft.name.trim();
    if (!name || !isValidParty(draft.partySize, draft.plusOnes, draft.children)) {
      return;
    }

    this.data.addGuest({
      ...draft,
      name,
      group: draft.group.trim() || 'New invitation',
      relationship: draft.relationship.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    });
    this.added.emit();
    this.closed.emit();
  }
}
