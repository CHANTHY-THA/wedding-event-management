import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import {
  BUDGET_TOTAL,
  GALLERY_SHARE_CODE,
  SEED_EXPENSES,
  SEED_GIFTS,
  SEED_GUESTS,
  SEED_INVITATION,
  SEED_PHOTOS,
  SEED_SCHEDULE,
  SEED_SHARED_PHOTOS,
  SEED_TABLES,
  SEED_TASKS,
  SEED_VENDORS,
  WEDDING_DETAILS,
  WEDDING_MEALS,
} from './wedding-seed-data';
import { amountDue, summarizeByCategory, upcomingPayments } from '../shared/utils/budget';
import {
  BudgetExpense,
  GiftRecord,
  Guest,
  GuestRsvp,
  InvitationSettings,
  NewBudgetExpense,
  NewGiftRecord,
  NewGuest,
  NewScheduleItem,
  NewVendor,
  NewWeddingTask,
  ScheduleItem,
  SeatingTable,
  SharedPhoto,
  Vendor,
  WeddingPhoto,
  WeddingTask,
} from './wedding.models';

/** Next free numeric id for a list of records. */
function nextId(records: { id: number }[]): number {
  return Math.max(0, ...records.map((record) => record.id)) + 1;
}

export const MAX_GALLERY_PHOTOS = 6;
/** Most photos one guest can add in a single upload from their phone. */
export const MAX_SHARED_UPLOAD = 10;

@Injectable({ providedIn: 'root' })
export class WeddingDataService {
  readonly guests = signal<Guest[]>(structuredClone(SEED_GUESTS));
  readonly schedule = signal<ScheduleItem[]>(structuredClone(SEED_SCHEDULE));
  readonly photos = signal<WeddingPhoto[]>(structuredClone(SEED_PHOTOS));
  /** Photo files that failed to load (not added to the folder yet). */
  private readonly missingPhotoUrls = signal<ReadonlySet<string>>(new Set());
  /** Photos that actually exist; guests and the album only ever see these. */
  readonly availablePhotos = computed(() =>
    this.photos().filter((photo) => !this.missingPhotoUrls().has(photo.url)),
  );
  readonly meals = WEDDING_MEALS;
  readonly details = WEDDING_DETAILS;
  readonly coupleNames = `${WEDDING_DETAILS.partnerOne} & ${WEDDING_DETAILS.partnerTwo}`;
  readonly invitation = signal<InvitationSettings>(structuredClone(SEED_INVITATION));

  readonly budgetTotal = signal(BUDGET_TOTAL);
  readonly expenses = signal<BudgetExpense[]>(structuredClone(SEED_EXPENSES));
  readonly budgetCategories = computed(() => summarizeByCategory(this.expenses()));
  readonly budgetPlanned = computed(() =>
    this.expenses().reduce((total, expense) => total + expense.estimated, 0),
  );
  readonly budgetSpent = computed(() =>
    this.expenses().reduce((total, expense) => total + expense.paid, 0),
  );
  readonly budgetDue = computed(() =>
    this.expenses().reduce((total, expense) => total + amountDue(expense), 0),
  );
  readonly upcomingPayments = computed(() => upcomingPayments(this.expenses()));
  readonly nextPayment = computed(
    () => this.upcomingPayments().find((expense) => expense.dueDate) ?? null,
  );

  readonly vendors = signal<Vendor[]>(structuredClone(SEED_VENDORS));
  readonly tables = signal<SeatingTable[]>(structuredClone(SEED_TABLES));
  readonly gifts = signal<GiftRecord[]>(structuredClone(SEED_GIFTS));

  readonly galleryShareCode = GALLERY_SHARE_CODE;
  readonly galleryOpen = signal(true);
  readonly sharedPhotos = signal<SharedPhoto[]>(structuredClone(SEED_SHARED_PHOTOS));
  /** What guests see: newest first, without photos the couple hid. */
  readonly visibleSharedPhotos = computed(() =>
    this.sharedPhotos()
      .filter((photo) => !photo.hidden)
      .sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt) || right.id - left.id),
  );

  readonly tasks = signal<WeddingTask[]>(structuredClone(SEED_TASKS));
  readonly openTaskCount = computed(() => this.tasks().filter((task) => !task.done).length);

  readonly invitedCount = computed(() =>
    this.guests().reduce((total, guest) => total + guest.partySize, 0),
  );
  readonly confirmedCount = computed(() =>
    this.guests()
      .filter((guest) => guest.rsvp === 'Confirmed')
      .reduce((total, guest) => total + guest.attendingCount, 0),
  );
  readonly pendingCount = computed(() =>
    this.guests()
      .filter((guest) => guest.rsvp === 'Pending')
      .reduce((total, guest) => total + guest.partySize, 0),
  );
  /** Invited seats that will not be filled: declined parties plus unused seats of confirmed ones. */
  readonly declinedCount = computed(
    () => this.invitedCount() - this.confirmedCount() - this.pendingCount(),
  );
  readonly latestReplies = computed(() =>
    this.guests()
      .filter((guest) => guest.respondedAt)
      .sort((left, right) => right.respondedAt!.localeCompare(left.respondedAt!)),
  );
  readonly checkedInCount = computed(() =>
    this.guests()
      .filter((guest) => guest.checkedIn)
      .reduce((total, guest) => total + guest.attendingCount, 0),
  );

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    // Check each photo file once, up front, so a missing file never shows as a broken image.
    const checked = new Set<string>();
    effect(() => {
      for (const { url } of this.photos()) {
        if (checked.has(url) || url.startsWith('blob:')) {
          continue;
        }
        checked.add(url);
        const probe = new Image();
        probe.onerror = () => this.markPhotoMissing(url);
        probe.src = url;
      }
    });
  }

  /** Hides a photo whose file could not be loaded. */
  markPhotoMissing(url: string): void {
    this.missingPhotoUrls.update((urls) => new Set(urls).add(url));
  }

  addGuest(details: NewGuest): Guest {
    const guest: Guest = {
      ...details,
      id: Math.max(0, ...this.guests().map((entry) => entry.id)) + 1,
      invitationToken: crypto.randomUUID().replaceAll('-', ''),
      initials: details.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      rsvp: 'Pending',
      attendingCount: 0,
      checkedIn: false,
      mealChoice: '',
      tableId: null,
    };
    this.guests.update((guests) => [guest, ...guests]);
    return guest;
  }

  addGuests(guests: NewGuest[]): void {
    for (const guest of guests) {
      this.addGuest(guest);
    }
  }

  updateRsvp(token: string, response: GuestRsvp): boolean {
    const guest = this.findGuestByToken(token);
    if (
      !guest ||
      !Number.isInteger(response.attendees) ||
      response.attendees < 1 ||
      response.attendees > guest.partySize
    ) {
      return false;
    }

    this.guests.update((guests) =>
      guests.map((entry) =>
        entry.invitationToken === token
          ? {
              ...entry,
              rsvp: response.status,
              attendingCount: response.status === 'Confirmed' ? response.attendees : 0,
              checkedIn: false,
              respondedAt: new Date().toISOString(),
              mealChoice: response.status === 'Confirmed' ? response.mealChoice : '',
              tableId: response.status === 'Confirmed' ? entry.tableId : null,
            }
          : entry,
      ),
    );
    return true;
  }

  findGuestByToken(token: string): Guest | undefined {
    return this.guests().find((guest) => guest.invitationToken === token);
  }

  toggleCheckIn(id: number): void {
    this.guests.update((guests) =>
      guests.map((guest) =>
        guest.id === id && guest.rsvp === 'Confirmed'
          ? { ...guest, checkedIn: !guest.checkedIn }
          : guest,
      ),
    );
  }

  toggleTask(id: number): void {
    this.tasks.update((tasks) =>
      tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  addTask(task: NewWeddingTask): void {
    this.tasks.update((tasks) => [
      ...tasks,
      { ...task, done: false, id: Math.max(0, ...tasks.map((entry) => entry.id)) + 1 },
    ]);
  }

  updateTask(updated: WeddingTask): void {
    this.tasks.update((tasks) =>
      tasks.map((entry) => (entry.id === updated.id ? { ...updated } : entry)),
    );
  }

  removeTask(id: number): void {
    this.tasks.update((tasks) => tasks.filter((entry) => entry.id !== id));
  }

  addScheduleItem(item: NewScheduleItem): void {
    this.schedule.update((items) => [
      ...items,
      { ...item, id: Math.max(0, ...items.map((entry) => entry.id)) + 1 },
    ]);
  }

  updateScheduleItem(updated: ScheduleItem): void {
    this.schedule.update((items) =>
      items.map((entry) => (entry.id === updated.id ? { ...updated } : entry)),
    );
  }

  removeScheduleItem(id: number): void {
    this.schedule.update((items) => items.filter((entry) => entry.id !== id));
  }

  setBudgetTotal(total: number): void {
    if (Number.isFinite(total) && total >= 0) {
      this.budgetTotal.set(total);
    }
  }

  addExpense(expense: NewBudgetExpense): void {
    this.expenses.update((expenses) => [
      ...expenses,
      { ...expense, id: Math.max(0, ...expenses.map((entry) => entry.id)) + 1 },
    ]);
  }

  updateExpense(updated: BudgetExpense): void {
    this.expenses.update((expenses) =>
      expenses.map((entry) => (entry.id === updated.id ? { ...updated } : entry)),
    );
  }

  removeExpense(id: number): void {
    this.expenses.update((expenses) => expenses.filter((entry) => entry.id !== id));
  }

  findVendor(id: number | null): Vendor | undefined {
    return id === null ? undefined : this.vendors().find((vendor) => vendor.id === id);
  }

  addVendor(vendor: NewVendor): Vendor {
    const created = { ...vendor, id: nextId(this.vendors()) };
    this.vendors.update((vendors) => [...vendors, created]);
    return created;
  }

  updateVendor(updated: Vendor): void {
    this.vendors.update((vendors) =>
      vendors.map((entry) => (entry.id === updated.id ? { ...updated } : entry)),
    );
  }

  /** Removes a vendor and unlinks it from budget items and schedule events. */
  removeVendor(id: number): void {
    this.vendors.update((vendors) => vendors.filter((entry) => entry.id !== id));
    this.expenses.update((expenses) =>
      expenses.map((expense) =>
        expense.vendorId === id ? { ...expense, vendorId: null } : expense,
      ),
    );
    this.schedule.update((items) =>
      items.map((item) =>
        item.vendorIds.includes(id)
          ? { ...item, vendorIds: item.vendorIds.filter((vendorId) => vendorId !== id) }
          : item,
      ),
    );
  }

  addTable(name: string, capacity: number): void {
    this.tables.update((tables) => [...tables, { id: nextId(tables), name, capacity }]);
  }

  updateTable(updated: SeatingTable): void {
    this.tables.update((tables) =>
      tables.map((entry) => (entry.id === updated.id ? { ...updated } : entry)),
    );
  }

  /** Removes a table; its parties go back to the unseated list. */
  removeTable(id: number): void {
    this.tables.update((tables) => tables.filter((entry) => entry.id !== id));
    this.guests.update((guests) =>
      guests.map((guest) => (guest.tableId === id ? { ...guest, tableId: null } : guest)),
    );
  }

  seatGuest(guestId: number, tableId: number | null): void {
    this.guests.update((guests) =>
      guests.map((guest) => (guest.id === guestId ? { ...guest, tableId } : guest)),
    );
  }

  addGift(gift: NewGiftRecord): void {
    this.gifts.update((gifts) => [...gifts, { ...gift, id: nextId(gifts) }]);
  }

  updateGift(updated: GiftRecord): void {
    this.gifts.update((gifts) =>
      gifts.map((entry) => (entry.id === updated.id ? { ...updated } : entry)),
    );
  }

  removeGift(id: number): void {
    this.gifts.update((gifts) => gifts.filter((entry) => entry.id !== id));
  }

  toggleGiftThanked(id: number): void {
    this.gifts.update((gifts) =>
      gifts.map((gift) => (gift.id === id ? { ...gift, thanked: !gift.thanked } : gift)),
    );
  }

  updateInvitation(changes: Partial<InvitationSettings>): void {
    this.invitation.update((settings) => ({ ...settings, ...changes }));
  }

  addSharedPhotos(urls: string[], uploaderName: string): void {
    const uploadedAt = new Date().toISOString();
    this.sharedPhotos.update((photos) => {
      let id = nextId(photos);
      return [
        ...photos,
        ...urls.map((url) => ({ id: id++, url, uploaderName, uploadedAt, hidden: false })),
      ];
    });
  }

  toggleSharedPhotoHidden(id: number): void {
    this.sharedPhotos.update((photos) =>
      photos.map((photo) => (photo.id === id ? { ...photo, hidden: !photo.hidden } : photo)),
    );
  }

  removeSharedPhoto(id: number): string | undefined {
    const photo = this.sharedPhotos().find((entry) => entry.id === id);
    this.sharedPhotos.update((photos) => photos.filter((entry) => entry.id !== id));
    return photo?.url;
  }

  addPhotos(photos: Omit<WeddingPhoto, 'id'>[]): void {
    this.photos.update((current) => [
      ...current,
      ...photos.map((photo, index) => ({
        ...photo,
        id: Math.max(0, ...current.map((entry) => entry.id)) + index + 1,
      })),
    ]);
  }

  removePhoto(id: number): string | undefined {
    const photo = this.photos().find((entry) => entry.id === id);
    if (photo) {
      this.photos.update((photos) => photos.filter((entry) => entry.id !== id));
    }
    return photo?.url;
  }
}
