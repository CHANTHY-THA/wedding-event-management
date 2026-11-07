import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Guest, NewGuest } from '../../core/wedding.models';
import { isValidParty } from '../utils/guests';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const EMPTY_GUEST: NewGuest = {
  name: '',
  group: '',
  partySize: 1,
  plusOnes: 0,
  children: 0,
  side: 'Shared',
  relationship: '',
  nickname: '',
  email: '',
  phone: '',
  tags: [],
  wish: '',
  note: '',
};

const NUMERIC_FIELDS: ReadonlySet<keyof NewGuest> = new Set(['partySize', 'plusOnes', 'children']);

@Component({
  selector: 'app-guest-form-dialog',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './guest-form-dialog.html',
})
export class GuestFormDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();
  readonly added = output<void>();
  readonly guest = input<Guest | null>(null);

  protected readonly draft = signal<NewGuest>({ ...EMPTY_GUEST });
  protected readonly isEditing = computed(() => this.guest() !== null);

  constructor() {
    effect(() => {
      const guest = this.guest();
      this.draft.set(
        guest
          ? {
              name: guest.name,
              group: guest.group,
              partySize: guest.partySize,
              plusOnes: guest.plusOnes,
              children: guest.children,
              side: guest.side,
              relationship: guest.relationship,
              nickname: guest.nickname ?? '',
              email: guest.email,
              phone: guest.phone,
              tags: [...guest.tags],
              wish: guest.wish ?? '',
              note: guest.note ?? '',
            }
          : { ...EMPTY_GUEST },
      );
    });
  }

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

    const details: NewGuest = {
      ...draft,
      name,
      group: draft.group.trim() || 'New invitation',
      relationship: draft.relationship.trim(),
      nickname: draft.nickname?.trim() ?? '',
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      wish: draft.wish?.trim() ?? '',
      note: draft.note?.trim() ?? '',
    };
    const existing = this.guest();
    if (existing) {
      this.data.updateGuest({
        ...existing,
        ...details,
        initials: name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('')
          .toUpperCase(),
      });
      this.toast.show(`${name} updated`);
    } else {
      this.data.addGuest(details);
      this.toast.show(`${name} added to the guest list`);
    }
    this.added.emit();
    this.closed.emit();
  }
}
