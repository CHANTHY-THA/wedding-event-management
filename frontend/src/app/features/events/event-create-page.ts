import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { NewWeddingEvent } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type EventDraftField = keyof NewWeddingEvent;

function today(): string {
  const date = new Date();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function emptyDraft(): NewWeddingEvent {
  return {
    name: '',
    type: 'Wedding',
    partnerOne: '',
    partnerTwo: '',
    date: today(),
    time: '',
    venue: '',
    city: '',
    venueAddress: '',
    mapUrl: '',
    coverPhotoUrl: '/images/cover.jpg',
  };
}

@Component({
  selector: 'app-event-create-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './event-create-page.html',
  styleUrl: './event-create-page.scss',
})
export class EventCreatePage {
  private readonly data = inject(WeddingDataService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly session = this.auth.session;
  protected readonly language = this.locale.language;
  protected readonly draft = signal<NewWeddingEvent>(emptyDraft());
  protected readonly coverPhotoUrl = signal('/images/cover.jpg');
  protected readonly editingEvent = signal<string | null>(null);
  private keepCoverPhoto = false;
  private originalCoverPhotoUrl = '/images/cover.jpg';

  constructor() {
    const eventId = this.route.snapshot.queryParamMap.get('edit');
    if (eventId) {
      const event = this.data.events().find((entry) => entry.id === eventId);
      if (!event) {
        this.toast.show('Event not found.', 'danger');
        void this.router.navigateByUrl('/events');
        return;
      }
      this.editingEvent.set(event.id);
      this.originalCoverPhotoUrl = event.coverPhotoUrl;
      this.coverPhotoUrl.set(event.coverPhotoUrl);
      this.draft.set({
        name: event.name,
        type: event.type,
        partnerOne: event.details.partnerOne,
        partnerTwo: event.details.partnerTwo,
        date: event.details.date,
        time: event.time,
        venue: event.details.venue,
        city: event.details.city,
        venueAddress: event.venueAddress,
        mapUrl: event.mapUrl,
        coverPhotoUrl: event.coverPhotoUrl,
        rsvpDeadline: event.details.rsvpDeadline,
      });
    }
    this.destroyRef.onDestroy(() => {
      const url = this.coverPhotoUrl();
      if (!this.keepCoverPhoto && url.startsWith('blob:') && url !== this.originalCoverPhotoUrl) {
        URL.revokeObjectURL(url);
      }
    });
  }

  protected toggleLanguage(): void {
    this.language.set(this.language() === 'en' ? 'km' : 'en');
  }

  protected updateField(field: EventDraftField, event: Event): void {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLSelectElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, [field]: target.value }));
  }

  protected chooseCoverPhoto(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const file = target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.toast.show('Choose an image file.', 'danger');
      target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toast.show('The image must be smaller than 10 MB.', 'danger');
      target.value = '';
      return;
    }

    const previousUrl = this.coverPhotoUrl();
    if (previousUrl.startsWith('blob:') && previousUrl !== this.originalCoverPhotoUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    const url = URL.createObjectURL(file);
    this.coverPhotoUrl.set(url);
    this.draft.update((draft) => ({ ...draft, coverPhotoUrl: url }));
    target.value = '';
  }

  protected removeCoverPhoto(): void {
    const currentUrl = this.coverPhotoUrl();
    if (currentUrl.startsWith('blob:') && currentUrl !== this.originalCoverPhotoUrl) {
      URL.revokeObjectURL(currentUrl);
    }
    this.coverPhotoUrl.set('');
    this.draft.update((draft) => ({ ...draft, coverPhotoUrl: '' }));
  }

  protected submit(): void {
    const editingEventId = this.editingEvent();
    if (editingEventId) {
      if (!this.data.updateEvent(editingEventId, this.draft())) {
        this.toast.show('Event not found.', 'danger');
        return;
      }
      if (
        this.originalCoverPhotoUrl.startsWith('blob:') &&
        this.originalCoverPhotoUrl !== this.coverPhotoUrl()
      ) {
        URL.revokeObjectURL(this.originalCoverPhotoUrl);
      }
      this.keepCoverPhoto = this.coverPhotoUrl().startsWith('blob:');
      this.toast.show('Event updated');
      void this.router.navigateByUrl('/events');
      return;
    }
    const event = this.data.createEvent(this.draft());
    this.keepCoverPhoto = event.coverPhotoUrl.startsWith('blob:');
    this.toast.show('Event created');
    void this.router.navigateByUrl(`/event/${event.id}`);
  }
}
