import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

export interface LightboxPhoto {
  url: string;
  alt: string;
}

const SLIDESHOW_MS = 3500;
const SWIPE_PX = 50;

/**
 * Full-screen photo viewer: arrows, keyboard (← → Esc), swipe, slideshow and thumbnails.
 * Open it by setting `index`; it sets `index` back to null when closed.
 */
@Component({
  selector: 'app-photo-lightbox',
  host: {
    '(document:keydown)': 'onKey($event)',
  },
  template: `
    @if (current(); as photo) {
      <div
        class="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Photo viewer"
        (touchstart)="touchStart($event)"
        (touchend)="touchEnd($event)"
      >
        <span class="lightbox-count">{{ index()! + 1 }} / {{ photos().length }}</span>
        <div class="lightbox-tools">
          <button
            type="button"
            [attr.aria-label]="playing() ? 'Pause slideshow' : 'Play slideshow'"
            (click)="togglePlay()"
          >
            @if (playing()) {
              <svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" /></svg>
            } @else {
              <svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z" /></svg>
            }
          </button>
          <button type="button" aria-label="Full screen" (click)="toggleFullscreen()">
            <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
          <button #closeButton type="button" aria-label="Close" (click)="close()">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        @if (photos().length > 1) {
          <button
            class="lightbox-nav prev"
            type="button"
            aria-label="Previous photo"
            (click)="step(-1)"
          >
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button class="lightbox-nav next" type="button" aria-label="Next photo" (click)="step(1)">
            <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        }
        <figure class="lightbox-stage">
          @for (shown of [photo]; track shown.url) {
            <img [src]="shown.url" [alt]="shown.alt" />
          }
        </figure>
        @if (photos().length > 1) {
          <div class="lightbox-thumbs">
            @for (thumb of photos(); track $index) {
              <button
                type="button"
                [class.active]="$index === index()"
                [attr.aria-label]="'Show photo ' + ($index + 1)"
                [attr.aria-current]="$index === index()"
                (click)="index.set($index)"
              >
                <img [src]="thumb.url" alt="" />
              </button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class PhotoLightbox {
  private readonly document = inject(DOCUMENT);

  readonly photos = input.required<LightboxPhoto[]>();
  readonly index = model<number | null>(null);

  protected readonly current = computed(() => {
    const index = this.index();
    return index === null ? null : (this.photos()[index] ?? null);
  });
  protected readonly playing = signal(false);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private touchX: number | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // Keep keyboard focus inside the viewer and stop the page scrolling behind it.
    effect(() => {
      const isOpen = this.current() !== null;
      this.document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen) {
        queueMicrotask(() => this.closeButton()?.nativeElement.focus());
      } else {
        this.stopSlideshow();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.stopSlideshow();
      this.document.body.style.overflow = '';
    });
  }

  protected step(direction: number): void {
    const count = this.photos().length;
    const index = this.index();
    if (index !== null && count) {
      this.index.set((index + direction + count) % count);
    }
  }

  protected close(): void {
    if (this.document.fullscreenElement) {
      void this.document.exitFullscreen();
    }
    this.index.set(null);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.stopSlideshow();
      return;
    }
    this.playing.set(true);
    this.timer = setInterval(() => this.step(1), SLIDESHOW_MS);
  }

  protected toggleFullscreen(): void {
    const viewer = this.document.querySelector('.lightbox');
    if (this.document.fullscreenElement) {
      void this.document.exitFullscreen();
    } else {
      void viewer?.requestFullscreen?.().catch(() => undefined);
    }
  }

  protected onKey(event: KeyboardEvent): void {
    if (this.current() === null) {
      return;
    }
    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'ArrowRight') {
      this.step(1);
    } else if (event.key === 'ArrowLeft') {
      this.step(-1);
    }
  }

  protected touchStart(event: TouchEvent): void {
    this.touchX = event.changedTouches[0]?.clientX ?? null;
  }

  protected touchEnd(event: TouchEvent): void {
    const endX = event.changedTouches[0]?.clientX;
    if (this.touchX !== null && endX !== undefined && Math.abs(endX - this.touchX) > SWIPE_PX) {
      this.step(endX < this.touchX ? 1 : -1);
    }
    this.touchX = null;
  }

  private stopSlideshow(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.playing.set(false);
  }
}
