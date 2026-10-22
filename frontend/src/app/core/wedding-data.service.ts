import { Injectable, computed, signal } from '@angular/core';
import {
  BUDGET_TOTAL,
  NEXT_PAYMENT,
  SEED_BUDGET,
  SEED_GUESTS,
  SEED_PHOTOS,
  SEED_SCHEDULE,
  SEED_TASKS,
  WEDDING_DETAILS,
  WEDDING_MEALS,
} from './wedding-seed-data';
import {
  BudgetCategory,
  Guest,
  GuestRsvp,
  NewGuest,
  NewScheduleItem,
  ScheduleItem,
  WeddingPhoto,
  WeddingTask,
} from './wedding.models';

export const MAX_GALLERY_PHOTOS = 6;

@Injectable({ providedIn: 'root' })
export class WeddingDataService {
  readonly guests = signal<Guest[]>(structuredClone(SEED_GUESTS));
  readonly schedule = signal<ScheduleItem[]>(structuredClone(SEED_SCHEDULE));
  readonly photos = signal<WeddingPhoto[]>(structuredClone(SEED_PHOTOS));
  readonly meals = WEDDING_MEALS;
  readonly details = WEDDING_DETAILS;
  readonly coupleNames = `${WEDDING_DETAILS.partnerOne} & ${WEDDING_DETAILS.partnerTwo}`;

  readonly budgetTotal = BUDGET_TOTAL;
  readonly budgetCategories = signal<BudgetCategory[]>(structuredClone(SEED_BUDGET));
  readonly nextPayment = NEXT_PAYMENT;
  readonly budgetSpent = computed(() =>
    this.budgetCategories().reduce((total, category) => total + category.spent, 0),
  );

  readonly tasks = signal<WeddingTask[]>(structuredClone(SEED_TASKS));

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

  addScheduleItem(item: NewScheduleItem): void {
    this.schedule.update((items) => [
      ...items,
      { ...item, id: Math.max(0, ...items.map((entry) => entry.id)) + 1 },
    ]);
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
