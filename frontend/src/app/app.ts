import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Guest, NewGuest, ScheduleItem, WeddingDataService } from './wedding-data.service';

type WorkspaceView = 'overview' | 'schedule' | 'guests' | 'invitations';
type GuestDraftField = keyof NewGuest;
type ScheduleDraftField = keyof Omit<ScheduleItem, 'id'>;

const DEFAULT_GUEST: NewGuest = {
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

const DEFAULT_SCHEDULE_ITEM: Omit<ScheduleItem, 'id'> = {
  title: '',
  type: 'Ceremony',
  date: '2026-10-24',
  time: '09:00',
  endTime: '10:00',
  location: '',
  responsible: '',
};

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  protected readonly isInvitationRoute = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.startsWith('/invite/')),
    ),
    { initialValue: this.router.url.startsWith('/invite/') },
  );
  protected readonly data = inject(WeddingDataService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly guests = this.data.guests;
  protected readonly schedule = this.data.schedule;
  protected readonly photos = this.data.photos;
  protected readonly meals = this.data.meals;
  protected readonly invitedCount = this.data.invitedCount;
  protected readonly confirmedCount = this.data.confirmedCount;
  protected readonly pendingCount = this.data.pendingCount;
  protected readonly checkedInCount = this.data.checkedInCount;

  protected readonly activeView = signal<WorkspaceView>('overview');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<'all' | Guest['rsvp']>('all');
  protected readonly isGuestFormOpen = signal(false);
  protected readonly isScheduleFormOpen = signal(false);
  protected readonly csvMessage = signal('');
  protected readonly copyMessage = signal('');
  protected readonly photoMessage = signal('');
  protected readonly guestDraft = signal<NewGuest>({ ...DEFAULT_GUEST });
  protected readonly scheduleDraft = signal({ ...DEFAULT_SCHEDULE_ITEM });

  protected readonly filteredGuests = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.guests().filter((guest) => {
      const matchesQuery =
        !query ||
        guest.name.toLowerCase().includes(query) ||
        guest.group.toLowerCase().includes(query) ||
        guest.relationship.toLowerCase().includes(query) ||
        guest.tags.some((tag) => tag.toLowerCase().includes(query));
      const matchesStatus = status === 'all' || guest.rsvp === status;

      return matchesQuery && matchesStatus;
    });
  });
  protected readonly orderedSchedule = computed(() =>
    [...this.schedule()].sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
    ),
  );
  protected readonly scheduleDays = computed(() => {
    const days = new Map<string, ScheduleItem[]>();
    for (const item of this.orderedSchedule()) {
      const day = days.get(item.date) ?? [];
      day.push(item);
      days.set(item.date, day);
    }
    return Array.from(days, ([date, items]) => ({ date, items }));
  });
  protected readonly pageTitle = computed(() => {
    const titles: Record<WorkspaceView, string> = {
      overview: 'Overview',
      schedule: 'Event schedule',
      guests: 'Guest management',
      invitations: 'Invitations & RSVP',
    };
    return titles[this.activeView()];
  });

  protected selectView(view: WorkspaceView): void {
    this.activeView.set(view);
    this.copyMessage.set('');
  }

  protected openBudget(): void {
    this.activeView.set('overview');
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => document.getElementById('budget')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  protected openGuestForm(): void {
    this.guestDraft.set({ ...DEFAULT_GUEST });
    this.isGuestFormOpen.set(true);
  }

  protected closeGuestForm(): void {
    this.isGuestFormOpen.set(false);
  }

  protected updateGuestField(field: GuestDraftField, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }
    const value = target.value;
    this.guestDraft.update((draft) => ({
      ...draft,
      [field]:
        field === 'partySize' || field === 'plusOnes' || field === 'children'
          ? Number(value)
          : field === 'tags'
            ? value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
            : value,
    }));
  }

  protected addGuest(): void {
    const draft = this.guestDraft();
    const name = draft.name.trim();
    if (
      !name ||
      !Number.isInteger(draft.partySize) ||
      draft.partySize < 1 ||
      draft.partySize > 20 ||
      !Number.isInteger(draft.plusOnes) ||
      draft.plusOnes < 0 ||
      !Number.isInteger(draft.children) ||
      draft.children < 0 ||
      draft.plusOnes + draft.children > draft.partySize
    ) {
      return;
    }

    this.data.addGuest({
      ...draft,
      name,
      group: draft.group.trim() || 'New invitation',
      relationship: draft.relationship.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      tags: draft.tags,
    });
    this.statusFilter.set('all');
    this.searchTerm.set('');
    this.closeGuestForm();
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
    if (file.size > 2_000_000) {
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

    const rows = this.parseCsv(contents);
    if (rows === null) {
      this.csvMessage.set(
        'The CSV has an unclosed quoted field. Check the quotation marks and try again.',
      );
      return;
    }
    if (!rows.length) {
      this.csvMessage.set('The CSV is empty.');
      return;
    }

    const headers = rows[0].map((header) =>
      header
        .trim()
        .replace(/^\uFEFF/, '')
        .toLowerCase()
        .replace(/[\s_-]/g, ''),
    );
    const nameIndex = headers.indexOf('name');
    if (nameIndex < 0) {
      this.csvMessage.set(
        'The CSV needs a "name" header. See the example columns above the import button.',
      );
      return;
    }

    const read = (row: string[], key: string): string => {
      const index = headers.indexOf(key);
      return index < 0 ? '' : (row[index] ?? '').trim();
    };
    const imported: NewGuest[] = [];
    let skipped = 0;
    for (const row of rows.slice(1)) {
      if (row.every((value) => !value.trim())) {
        continue;
      }
      const partySize = Number(read(row, 'partysize') || 1);
      const plusOnes = Number(read(row, 'plusones') || 0);
      const children = Number(read(row, 'children') || 0);
      if (
        !read(row, 'name') ||
        !Number.isInteger(partySize) ||
        partySize < 1 ||
        partySize > 20 ||
        !Number.isInteger(plusOnes) ||
        plusOnes < 0 ||
        !Number.isInteger(children) ||
        children < 0 ||
        plusOnes + children > partySize
      ) {
        skipped++;
        continue;
      }
      const side = read(row, 'side').toLowerCase();
      imported.push({
        name: read(row, 'name'),
        group: read(row, 'group') || 'Imported guests',
        partySize,
        plusOnes,
        children,
        side: side === 'bride' ? 'Bride' : side === 'groom' ? 'Groom' : 'Shared',
        relationship: read(row, 'relationship'),
        email: read(row, 'email'),
        phone: read(row, 'phone'),
        tags: read(row, 'tags')
          .split(';')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    }

    if (imported.length) {
      this.data.addGuests(imported);
      this.statusFilter.set('all');
      this.searchTerm.set('');
    }
    this.csvMessage.set(
      imported.length
        ? `Imported ${imported.length} ${imported.length === 1 ? 'party' : 'parties'}${skipped ? `; skipped ${skipped} invalid ${skipped === 1 ? 'row' : 'rows'}.` : '.'}`
        : 'No valid guest rows found. Check names and party-size values in your CSV.',
    );
  }

  protected openScheduleForm(): void {
    this.scheduleDraft.set({ ...DEFAULT_SCHEDULE_ITEM });
    this.isScheduleFormOpen.set(true);
  }

  protected closeScheduleForm(): void {
    this.isScheduleFormOpen.set(false);
  }

  protected updateScheduleField(field: ScheduleDraftField, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }
    this.scheduleDraft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected addScheduleItem(): void {
    const draft = this.scheduleDraft();
    if (
      !draft.title.trim() ||
      !draft.date ||
      !draft.time ||
      !draft.endTime ||
      !draft.location.trim() ||
      !draft.responsible.trim()
    ) {
      return;
    }
    if (draft.endTime <= draft.time) {
      return;
    }
    this.data.addScheduleItem({
      ...draft,
      title: draft.title.trim(),
      location: draft.location.trim(),
      responsible: draft.responsible.trim(),
    });
    this.closeScheduleForm();
  }

  protected toggleCheckIn(id: number): void {
    this.data.toggleCheckIn(id);
  }

  protected invitePath(token: string): string {
    return `/invite/${encodeURIComponent(token)}`;
  }

  protected async copyInvite(token: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      this.copyMessage.set(
        'Clipboard access is unavailable. Open the invitation to copy its link.',
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(
        new URL(this.invitePath(token), window.location.origin).toString(),
      );
      this.copyMessage.set('Invitation link copied.');
    } catch (error) {
      console.error('Could not copy the invitation link.', error);
      this.copyMessage.set(
        'Could not copy the link. Open the invitation and copy its address instead.',
      );
    }
  }

  protected async uploadPhotos(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }

    const files = Array.from(input.files);
    input.value = '';
    const remaining = 6 - this.photos().length;
    if (remaining <= 0) {
      this.photoMessage.set(
        'The invitation gallery is full. Remove a photo before adding another.',
      );
      return;
    }
    const accepted: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        errors.push(`${file.name}: choose a JPG, PNG, or WebP image.`);
      } else if (file.size > 8_000_000) {
        errors.push(`${file.name}: the file must be 8 MB or smaller.`);
      } else {
        accepted.push(file);
      }
    }

    if (this.photos().length + accepted.length > 6) {
      errors.push('The gallery can contain up to 6 photos.');
    }
    const toAdd = accepted.slice(0, remaining);
    if (!toAdd.length) {
      this.photoMessage.set(errors.join(' '));
      return;
    }

    this.data.addPhotos(toAdd.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
    this.photoMessage.set(
      `Added ${toAdd.length} ${toAdd.length === 1 ? 'photo' : 'photos'} to the invitation.${errors.length ? ` ${errors.join(' ')}` : ''}`,
    );
  }

  protected removePhoto(id: number): void {
    const url = this.data.removePhoto(id);
    if (url) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      this.photoMessage.set('Photo removed from the invitation gallery.');
    }
  }

  protected reminderHref(guest: Guest, channel: 'email' | 'sms' | 'whatsapp' | 'telegram'): string {
    const invite = isPlatformBrowser(this.platformId)
      ? new URL(this.invitePath(guest.invitationToken), window.location.origin).toString()
      : this.invitePath(guest.invitationToken);
    const text = `You're invited to Sophia and James's wedding. RSVP here: ${invite}`;
    const subject = 'Your wedding invitation from Sophia & James';

    switch (channel) {
      case 'email':
        return guest.email
          ? `mailto:${encodeURIComponent(guest.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
          : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      case 'sms':
        return `sms:${encodeURIComponent(guest.phone)}?body=${encodeURIComponent(text)}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(invite)}&text=${encodeURIComponent(subject)}`;
    }
  }

  private parseCsv(input: string): string[][] | null {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < input.length; index++) {
      const character = input[index];
      if (character === '"') {
        if (quoted && input[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          quoted = !quoted;
        }
      } else if (character === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && input[index + 1] === '\n') {
          index++;
        }
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += character;
      }
    }
    if (quoted) {
      return null;
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }
}
