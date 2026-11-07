import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Guest } from '../../core/wedding.models';
import { GuestFormDialog } from '../../shared/guest-form-dialog/guest-form-dialog';
import { GuestInviteDialog } from './guest-invite-dialog';
import { GuestTicketDialog } from './guest-ticket-dialog';
import { parseGuestCsv } from '../../shared/utils/guest-csv';
import { filterGuests, RsvpFilter } from '../../shared/utils/guests';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

const MAX_CSV_BYTES = 2_000_000;

@Component({
  selector: 'app-guests-page',
  imports: [TranslatePipe, FormsModule, GuestFormDialog, GuestInviteDialog, GuestTicketDialog],
  templateUrl: './guests-page.html',
  styleUrl: './guests-page.scss',
})
export class GuestsPage {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly invitedCount = this.data.invitedCount;
  protected readonly guests = this.data.guests;

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<RsvpFilter>('all');
  protected readonly groupFilter = signal('');
  protected readonly tagFilter = signal('');
  protected readonly pageSize = signal(10);
  protected readonly currentPage = signal(1);
  protected readonly isGuestFormOpen = signal(false);
  protected readonly editingGuest = signal<Guest | null>(null);
  protected readonly inviteDialogGuest = signal<Guest | null>(null);
  protected readonly ticketGuest = signal<Guest | null>(null);
  protected readonly deletePrompt = signal<Guest[] | null>(null);
  protected readonly selectedGuestIds = signal<ReadonlySet<number>>(new Set());
  protected readonly activeMenuGuest = signal<Guest | null>(null);
  protected readonly menuPosition = signal<{ top: number; left: number } | null>(null);
  protected readonly csvMessage = signal('');
  protected readonly groups = computed(() =>
    [...new Set(this.guests().map((guest) => guest.group).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  protected readonly tags = computed(() =>
    [...new Set(this.guests().flatMap((guest) => guest.tags))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );
  protected readonly filteredGuests = computed(() =>
    filterGuests(this.guests(), this.searchTerm(), this.statusFilter()).filter(
      (guest) =>
        (!this.groupFilter() || guest.group === this.groupFilter()) &&
        (!this.tagFilter() || guest.tags.includes(this.tagFilter())),
    ),
  );
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filteredGuests().length / this.pageSize())),
  );
  protected readonly effectivePage = computed(() =>
    Math.min(this.currentPage(), this.pageCount()),
  );
  protected readonly visibleGuests = computed(() => {
    const start = (this.effectivePage() - 1) * this.pageSize();
    return this.filteredGuests().slice(start, start + this.pageSize());
  });
  protected readonly selectedCount = computed(() => this.selectedGuestIds().size);
  protected readonly allVisibleSelected = computed(
    () =>
      this.visibleGuests().length > 0 &&
      this.visibleGuests().every((guest) => this.selectedGuestIds().has(guest.id)),
  );

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.groupFilter.set('');
    this.tagFilter.set('');
    this.currentPage.set(1);
  }

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  protected setGroupFilter(value: string): void {
    this.groupFilter.set(value);
    this.currentPage.set(1);
  }

  protected setTagFilter(value: string): void {
    this.tagFilter.set(value);
    this.currentPage.set(1);
  }

  protected setStatusFilter(value: RsvpFilter): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  protected openAddForm(): void {
    this.editingGuest.set(null);
    this.isGuestFormOpen.set(true);
    this.closeMenu();
  }

  protected openEditForm(guest: Guest): void {
    this.editingGuest.set(guest);
    this.isGuestFormOpen.set(true);
    this.closeMenu();
  }

  protected toggleGuestSelection(id: number, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.selectedGuestIds.update((ids) => {
      const next = new Set(ids);
      if (target.checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  protected toggleVisibleSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.selectedGuestIds.update((ids) => {
      const next = new Set(ids);
      for (const guest of this.visibleGuests()) {
        if (target.checked) {
          next.add(guest.id);
        } else {
          next.delete(guest.id);
        }
      }
      return next;
    });
  }

  protected requestDelete(guest?: Guest): void {
    const guests = guest
      ? [guest]
      : this.guests().filter((entry) => this.selectedGuestIds().has(entry.id));
    if (guests.length) {
      this.deletePrompt.set(guests);
      this.closeMenu();
    }
  }

  protected confirmDelete(): void {
    const guests = this.deletePrompt();
    if (!guests?.length) {
      return;
    }
    const ids = new Set(guests.map((guest) => guest.id));
    this.data.removeGuests(ids);
    this.selectedGuestIds.update((selected) => new Set([...selected].filter((id) => !ids.has(id))));
    this.deletePrompt.set(null);
    this.toast.show(
      `${guests.length} ${guests.length === 1 ? 'guest' : 'guests'} deleted`,
      'info',
    );
  }

  protected toggleRowMenu(guest: Guest, event: MouseEvent): void {
    if (this.activeMenuGuest()?.id === guest.id) {
      this.closeMenu();
      return;
    }
    const button = event.currentTarget;
    const view = this.document.defaultView;
    if (!(button instanceof HTMLButtonElement) || !view) {
      return;
    }
    const rect = button.getBoundingClientRect();
    const menuHeight = 100;
    this.menuPosition.set({
      top:
        rect.bottom + menuHeight + 6 <= view.innerHeight
          ? rect.bottom + 6
          : Math.max(8, rect.top - menuHeight - 6),
      left: Math.max(8, Math.min(rect.right - 205, view.innerWidth - 213)),
    });
    this.activeMenuGuest.set(guest);
  }

  protected closeMenu(): void {
    this.activeMenuGuest.set(null);
    this.menuPosition.set(null);
  }

  protected openTicket(guest: Guest): void {
    this.ticketGuest.set(guest);
    this.closeMenu();
  }

  protected invitationPath(guest: Guest): string {
    return `/invite/${encodeURIComponent(guest.invitationToken)}`;
  }

  protected inviteGuest(guest: Guest): void {
    this.closeMenu();
    this.inviteDialogGuest.set(guest);
  }

  protected reminderHref(guest: Guest, channel: 'email' | 'sms' | 'whatsapp'): string {
    const invite = this.invitationUrl(guest);
    const text = `You're invited to ${this.data.coupleNames}'s wedding. RSVP here: ${invite}`;
    const subject = `Your wedding invitation from ${this.data.coupleNames}`;
    switch (channel) {
      case 'email':
        return `mailto:${guest.email ? encodeURIComponent(guest.email) : ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      case 'sms':
        return `sms:${encodeURIComponent(guest.phone)}?body=${encodeURIComponent(text)}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
    }
  }

  protected async copyInvitationLink(guest: Guest): Promise<void> {
    if (!this.isBrowser || !navigator.clipboard) {
      this.toast.show('Clipboard access is unavailable in this browser.', 'danger');
      return;
    }
    try {
      await navigator.clipboard.writeText(this.invitationUrl(guest));
      this.toast.show('Invitation link copied', 'info');
      this.closeMenu();
    } catch (error) {
      console.error('Could not copy the guest invitation link.', error);
      this.toast.show('Could not copy the invitation link. Please try again.', 'danger');
    }
  }

  private invitationUrl(guest: Guest): string {
    const path = this.invitationPath(guest);
    const origin = this.document.location?.origin;
    return origin ? new URL(path, origin).toString() : path;
  }

  protected goToPage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(this.pageCount(), page)));
  }

  protected setPageSize(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.pageSize.set(Number(target.value));
    this.currentPage.set(1);
  }

  protected toggleCheckIn(id: number): void {
    this.data.toggleCheckIn(id);
  }

  protected async importCsv(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }
    const file = input.files[0];
    input.value = '';
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.csvMessage.set('Choose a CSV file to import guest records.');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      this.csvMessage.set(
        'The CSV is larger than 2 MB. Split it into smaller files and try again.',
      );
      return;
    }

    let contents: string;
    try {
      contents = await file.text();
    } catch (error) {
      console.error('Could not read the selected guest CSV.', error);
      this.csvMessage.set('The CSV could not be read. Please choose the file again.');
      return;
    }

    const result = parseGuestCsv(contents);
    if (!result.ok) {
      this.csvMessage.set(result.error);
      return;
    }

    const { guests, skipped } = result;
    if (guests.length) {
      this.data.addGuests(guests);
      this.resetFilters();
      this.selectedGuestIds.set(new Set());
    }
    this.csvMessage.set(
      guests.length
        ? `Imported ${guests.length} ${guests.length === 1 ? 'party' : 'parties'}${skipped ? `; skipped ${skipped} invalid ${skipped === 1 ? 'row' : 'rows'}.` : '.'}`
        : 'No valid guest rows found. Check names and party-size values in your CSV.',
    );
  }
}
