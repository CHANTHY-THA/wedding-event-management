import { DatePipe, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { SharedPhoto } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { QrCode } from '../../shared/qr-code/qr-code';

@Component({
  selector: 'app-gallery-page',
  imports: [DatePipe, QrCode, RouterLink, TranslatePipe],
  templateUrl: './gallery-page.html',
  styleUrl: './gallery-page.scss',
})
export class GalleryPage {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly coupleNames = this.data.coupleNames;
  protected readonly isOpen = this.data.galleryOpen;
  protected readonly sharePath = `/share/${this.data.galleryShareCode}`;
  protected readonly shareUrl = `${this.isBrowser ? this.document.location.origin : ''}${this.sharePath}`;
  protected readonly qrDataUrl = signal('');

  protected readonly photos = computed(() =>
    [...this.data.sharedPhotos()].sort(
      (left, right) => right.uploadedAt.localeCompare(left.uploadedAt) || right.id - left.id,
    ),
  );
  protected readonly visibleCount = computed(() => this.data.visibleSharedPhotos().length);
  protected readonly hiddenCount = computed(() => this.photos().length - this.visibleCount());
  protected readonly contributorCount = computed(
    () =>
      new Set(
        this.photos()
          .map((photo) => photo.uploaderName.trim().toLowerCase())
          .filter(Boolean),
      ).size,
  );
  /** Photo awaiting a second click on Delete. */
  protected readonly confirmingDeleteId = signal<number | null>(null);

  protected toggleOpen(): void {
    this.isOpen.update((open) => !open);
    this.toast.show(
      this.isOpen() ? 'Guests can share photos again' : 'Photo uploads closed',
      'info',
    );
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      this.toast.show('Gallery link copied');
    } catch {
      this.toast.show('Could not copy the link. Select it and copy it instead.', 'danger');
    }
  }

  protected downloadQr(): void {
    const link = this.document.createElement('a');
    link.href = this.qrDataUrl();
    link.download = 'wedding-photo-gallery-qr.png';
    link.click();
  }

  protected printPoster(): void {
    this.document.defaultView?.print();
  }

  protected toggleHidden(photo: SharedPhoto): void {
    this.data.toggleSharedPhotoHidden(photo.id);
    this.toast.show(
      photo.hidden ? 'Photo is visible to guests again' : 'Photo hidden from guests',
      'info',
    );
  }

  protected deletePhoto(photo: SharedPhoto): void {
    if (this.confirmingDeleteId() !== photo.id) {
      this.confirmingDeleteId.set(photo.id);
      return;
    }
    const url = this.data.removeSharedPhoto(photo.id);
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    this.confirmingDeleteId.set(null);
    this.toast.show('Photo deleted', 'info');
  }
}
