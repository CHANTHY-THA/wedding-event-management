import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WeddingDataService } from '../../core/wedding-data.service';
import { GuestRsvp } from '../../core/wedding.models';
import { groupScheduleByDay } from '../../shared/utils/schedule';

/** Public, token-addressed invitation and RSVP form (`/invite/:token`). */
@Component({
  selector: 'app-guest-invitation-page',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './guest-invitation-page.html',
})
export class GuestInvitationPage {
  private readonly wedding = inject(WeddingDataService);
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  protected readonly guest = computed(() => this.wedding.findGuestByToken(this.token));
  protected readonly scheduleDays = computed(() => groupScheduleByDay(this.wedding.schedule()));
  protected readonly details = this.wedding.details;
  protected readonly photos = this.wedding.photos;
  protected readonly meals = this.wedding.meals;
  protected readonly attendeeOptions = computed(() =>
    Array.from({ length: this.guest()?.partySize ?? 0 }, (_, index) => index + 1),
  );
  protected readonly attendees = signal(1);
  protected readonly mealChoice = signal(this.meals[0].name);
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
