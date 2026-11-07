import { DatePipe, DOCUMENT, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { FREE_TEMPLATE_ID, isTemplateId } from '../../core/invitation-templates';
import { LocaleService } from '../../core/locale.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Currency, GuestRsvp } from '../../core/wedding.models';
import { LanguageToggle } from '../../shared/language-toggle/language-toggle';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LightboxPhoto, PhotoLightbox } from '../../shared/photo-lightbox/photo-lightbox';
import { QrCode } from '../../shared/qr-code/qr-code';
import { englishTime, khmerDate, khmerTime, toKhmerDigits } from '../../shared/utils/khmer-date';
import { groupScheduleByDay } from '../../shared/utils/schedule';

interface Petal {
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

/** Spread-out but fixed petal positions, so server and browser render the same markup. */
const PETALS: Petal[] = Array.from({ length: 18 }, (_, index) => ({
  left: (index * 37) % 100,
  delay: (index * 1.7) % 12,
  duration: 11 + ((index * 5) % 9),
  size: 9 + ((index * 7) % 9),
  drift: ((index % 5) - 2) * 30,
}));

const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_WEEKDAYS_KM = ['អា', 'ច', 'អ', 'ពុ', 'ព្រ', 'សុ', 'ស'];
const CALENDAR_MONTHS_KM = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

/** Public, token-addressed invitation and RSVP form (`/invite/:token`). */
@Component({
  selector: 'app-guest-invitation-page',
  imports: [
    TranslatePipe,
    DatePipe,
    FormsModule,
    LanguageToggle,
    NgTemplateOutlet,
    PhotoLightbox,
    QrCode,
    RouterLink,
  ],
  templateUrl: './guest-invitation-page.html',
})
export class GuestInvitationPage {
  private readonly wedding = inject(WeddingDataService);
  private readonly locale = inject(LocaleService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly route = inject(ActivatedRoute);

  protected readonly token = this.route.snapshot.paramMap.get('token') ?? '';
  /**
   * The design the couple chose, from the server (fetched while the page renders on the server,
   * then reused by the browser). The free design if the link is unknown or the API is down.
   */
  private readonly chosenTemplate = toSignal(
    inject(HttpClient)
      .get<{ templateId: string }>(`/api/public/invitations/${encodeURIComponent(this.token)}`)
      .pipe(
        map(({ templateId }) => (isTemplateId(templateId) ? templateId : FREE_TEMPLATE_ID)),
        catchError(() => of(FREE_TEMPLATE_ID)),
      ),
    { initialValue: FREE_TEMPLATE_ID },
  );
  /** `?template=<id>` previews a design from the template store; otherwise the couple's chosen one. */
  private readonly previewTemplate = this.route.snapshot.queryParamMap.get('template');
  protected readonly template = computed(() =>
    isTemplateId(this.previewTemplate) ? this.previewTemplate : this.chosenTemplate(),
  );
  /** Previewing a design guests do not see; marked so the link is not shared by mistake. */
  protected readonly isPreview = computed(
    () => isTemplateId(this.previewTemplate) && this.previewTemplate !== this.chosenTemplate(),
  );
  protected readonly guest = computed(() => this.wedding.findGuestByToken(this.token));
  protected readonly scheduleDays = computed(() => groupScheduleByDay(this.wedding.schedule()));
  protected readonly details = this.wedding.details;
  protected readonly settings = this.wedding.invitation;
  protected readonly photos = this.wedding.availablePhotos;
  protected readonly meals = this.wedding.meals;
  protected readonly petals = PETALS;

  protected readonly isKhmer = computed(() => this.locale.language() === 'km');
  /** The cover file that failed to load (not added yet); the first gallery photo is used instead. */
  private readonly failedCoverUrl = signal('');
  protected readonly coverPhoto = computed(() => {
    const cover = this.settings().coverPhotoUrl;
    return (cover && cover !== this.failedCoverUrl() ? cover : '') || this.photos()[0]?.url || '';
  });
  /** A second photo for the event card, so it differs from the cover where possible. */
  protected readonly eventPhoto = computed(() => this.photos()[1]?.url || this.coverPhoto());
  protected readonly dateText = computed(() =>
    this.isKhmer() ? khmerDate(this.details.date) : '',
  );
  protected readonly timeText = computed(() =>
    this.isKhmer()
      ? khmerTime(this.settings().ceremonyTime)
      : englishTime(this.settings().ceremonyTime),
  );
  /** "24 . 10 . 2026 | 9:00 AM", the numeric line under the date (Western digits, as printed cards do). */
  protected readonly numericDate = computed(() => {
    const [year, month, day] = this.details.date.split('-');
    return `${day} . ${month} . ${year} | ${englishTime(this.settings().ceremonyTime)}`;
  });
  protected readonly weddingCalendar = computed(() => {
    const [year, month, weddingDay] = this.details.date.split('-').map(Number);
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);
    const title = this.isKhmer()
      ? `ខែ${CALENDAR_MONTHS_KM[month - 1]} ${toKhmerDigits(year)}`
      : new Intl.DateTimeFormat('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(year, month - 1, 1)));

    return {
      title,
      weekdays: this.isKhmer() ? CALENDAR_WEEKDAYS_KM : CALENDAR_WEEKDAYS,
      days: Array.from({ length: weekCount * 7 }, (_, index) => {
        const day = index - firstWeekday + 1;
        return day < 1 || day > daysInMonth
          ? null
          : { label: this.isKhmer() ? toKhmerDigits(day) : String(day), selected: day === weddingDay };
      }),
    };
  });

  private readonly now = signal(Date.now());
  /** Days, hours, minutes and seconds until the ceremony starts (zeros once it has begun). */
  protected readonly countdown = computed(() => {
    const [year, month, day] = this.details.date.split('-').map(Number);
    const [hours, minutes] = this.settings().ceremonyTime.split(':').map(Number);
    const target = new Date(year, month - 1, day, hours, minutes).getTime();
    let seconds = Math.max(0, Math.floor((target - this.now()) / 1000));
    const days = Math.floor(seconds / 86_400);
    seconds -= days * 86_400;
    const parts = [
      { value: days, label: 'Days' },
      { value: Math.floor(seconds / 3600), label: 'Hours' },
      { value: Math.floor((seconds % 3600) / 60), label: 'Minutes' },
      { value: seconds % 60, label: 'Seconds' },
    ];
    return parts.map((part) => ({ ...part, text: String(part.value).padStart(2, '0') }));
  });

  protected readonly giftCurrency = signal<Currency>('KHR');
  /** QR image URLs that failed to load (file not added yet); their tabs are hidden. */
  private readonly failedGiftUrls = signal<ReadonlySet<string>>(new Set());
  /** QR images to check up front, so a missing file never shows as a broken image. */
  protected readonly giftQrUrls = computed(() =>
    [this.settings().giftQrKhr, this.settings().giftQrUsd].filter(Boolean),
  );
  protected readonly giftOptions = computed(() => {
    const { giftQrKhr, giftQrUsd } = this.settings();
    const failed = this.failedGiftUrls();
    return [
      { currency: 'KHR' as Currency, url: giftQrKhr, label: 'Riel', symbol: '៛' },
      { currency: 'USD' as Currency, url: giftQrUsd, label: 'Dollar', symbol: '$' },
    ].filter((option) => option.url && !failed.has(option.url));
  });
  /** The chosen tab, or the first one that has a QR image. */
  protected readonly activeGift = computed(
    () =>
      this.giftOptions().find((option) => option.currency === this.giftCurrency()) ??
      this.giftOptions()[0] ??
      null,
  );
  protected readonly hasGiftQr = computed(() => this.giftOptions().length > 0);
  protected readonly hasSocialLinks = computed(() => {
    const { telegramUrl, facebookUrl, tiktokUrl } = this.settings();
    return !!(telegramUrl || facebookUrl || tiktokUrl);
  });

  private readonly music = viewChild<ElementRef<HTMLAudioElement>>('music');
  protected readonly isPlaying = signal(false);
  /** The music URL that failed to load (missing file, bad format); a new URL is tried again. */
  private readonly failedMusicUrl = signal('');
  protected readonly hasMusic = computed(() => {
    const url = this.settings().musicUrl;
    return !!url && url !== this.failedMusicUrl();
  });
  /** The opening screen; tapping it counts as the user gesture browsers need before playing sound. */
  protected readonly isOpened = signal(false);

  protected readonly lightboxIndex = signal<number | null>(null);
  protected readonly lightboxPhotos = computed<LightboxPhoto[]>(() =>
    this.photos().map((photo) => ({ url: photo.url, alt: `Pre-wedding photo: ${photo.name}` })),
  );

  protected readonly attendeeOptions = computed(() =>
    Array.from({ length: this.guest()?.partySize ?? 0 }, (_, index) => index + 1),
  );
  protected readonly attendees = signal(1);
  protected readonly mealChoice = signal(this.meals[0].name);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  /** Photos wider than tall; they span the full gallery row instead of sharing it. */
  protected readonly landscapeIds = signal<ReadonlySet<number>>(new Set());

  constructor() {
    const guest = this.guest();
    if (guest) {
      this.attendees.set(guest.rsvp === 'Confirmed' ? guest.attendingCount : guest.partySize);
      if (guest.mealChoice) {
        this.mealChoice.set(guest.mealChoice);
      }
    }
    if (this.isBrowser) {
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  /** Reveals the card and starts the music in the same tap, which browsers allow. */
  protected openInvitation(): void {
    this.isOpened.set(true);
    if (this.template() === 'watercolor' && this.isBrowser) {
      requestAnimationFrame(() =>
        this.document.getElementById('welcome-title')?.scrollIntoView({ behavior: 'smooth' }),
      );
    }
    if (this.hasMusic()) {
      void this.playMusic();
    }
  }

  protected toggleMusic(): void {
    const audio = this.music()?.nativeElement;
    if (!audio) {
      return;
    }
    if (audio.paused) {
      void this.playMusic();
    } else {
      audio.pause();
      this.isPlaying.set(false);
    }
  }

  protected onMusicError(): void {
    this.failedMusicUrl.set(this.settings().musicUrl);
    this.isPlaying.set(false);
  }

  private async playMusic(): Promise<void> {
    const audio = this.music()?.nativeElement;
    if (!audio) {
      return;
    }
    try {
      await audio.play();
      this.isPlaying.set(true);
    } catch {
      // Blocked or unplayable: the play button stays available for another try.
      this.isPlaying.set(false);
    }
  }

  protected onCoverError(url: string): void {
    this.failedCoverUrl.set(url);
  }

  protected onGiftQrError(url: string): void {
    this.failedGiftUrls.update((urls) => new Set(urls).add(url));
  }

  protected downloadGiftQr(): void {
    const gift = this.activeGift();
    if (!gift) {
      return;
    }
    const link = this.document.createElement('a');
    link.href = gift.url;
    link.download = `wedding-gift-qr-${gift.currency.toLowerCase()}.png`;
    link.click();
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

  protected detectOrientation(photoId: number, event: Event): void {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.naturalWidth) {
      return;
    }
    const isLandscape = image.naturalWidth > image.naturalHeight;
    if (isLandscape !== this.landscapeIds().has(photoId)) {
      this.landscapeIds.update((ids) => {
        const next = new Set(ids);
        if (isLandscape) {
          next.add(photoId);
        } else {
          next.delete(photoId);
        }
        return next;
      });
    }
  }
}
