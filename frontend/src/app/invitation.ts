import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GuestRsvp, ScheduleItem, WeddingDataService } from './wedding-data.service';

@Component({
  selector: 'app-invitation',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './invitation.html',
})
export class Invitation {
  private readonly route = inject(ActivatedRoute);
  private readonly wedding = inject(WeddingDataService);
  protected readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  protected readonly guest = computed(() => this.wedding.findGuestByToken(this.token));
  protected readonly scheduleDays = computed(() => {
    const days = new Map<string, ScheduleItem[]>();
    const schedule = [...this.wedding.schedule()].sort((left, right) =>
      `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
    );
    for (const item of schedule) {
      const day = days.get(item.date) ?? [];
      day.push(item);
      days.set(item.date, day);
    }
    return Array.from(days, ([date, items]) => ({ date, items }));
  });
  protected readonly photos = this.wedding.photos;
  protected readonly meals = this.wedding.meals;
  protected readonly attendeeOptions = computed(() =>
    Array.from({ length: this.guest()?.partySize ?? 0 }, (_, index) => index + 1),
  );
  protected readonly attendees = signal(1);
  protected readonly mealChoice = signal('Chicken');
  protected readonly submitted = signal(false);
  protected readonly error = signal('');

  constructor() {
    const guest = this.guest();
    if (guest) {
      this.attendees.set(guest.rsvp === 'Confirmed' ? guest.attendingCount : guest.partySize);
      if (guest.mealChoice) {
        this.mealChoice.set(guest.mealChoice);
      }
    }
  }

  protected respond(status: GuestRsvp['status']): void {
    const guest = this.guest();
    if (!guest) {
      return;
    }

    const response: GuestRsvp = {
      status,
      attendees: Number(this.attendees()),
      mealChoice: this.mealChoice(),
    };
    if (!this.wedding.updateRsvp(this.token, response)) {
      this.error.set('Choose an attending guest count within your invitation limit.');
      return;
    }

    this.error.set('');
    this.submitted.set(true);
  }
}
