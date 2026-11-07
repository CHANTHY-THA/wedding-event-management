import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MAX_SHARED_UPLOAD, WeddingDataService } from '../../core/wedding-data.service';
import { LanguageToggle } from '../../shared/language-toggle/language-toggle';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { checkPhotoFiles } from '../../shared/utils/photos';

/** Public page guests reach by scanning the gallery QR code (`/share/:code`). */
@Component({
  selector: 'app-photo-share-page',
  imports: [DatePipe, FormsModule, LanguageToggle, TranslatePipe],
  templateUrl: './photo-share-page.html',
  styleUrl: './photo-share-page.scss',
})
export class PhotoSharePage {
  private readonly data = inject(WeddingDataService);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly isValidLink = this.code === this.data.galleryShareCode;
  protected readonly isOpen = this.data.galleryOpen;
  protected readonly coupleNames = this.data.coupleNames;
  protected readonly details = this.data.details;
  protected readonly photos = this.data.visibleSharedPhotos;

  protected readonly guestName = signal('');
  protected readonly message = signal('');
  protected readonly errors = signal<string[]>([]);
  protected readonly photoCount = computed(() => this.photos().length);

  protected upload(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length || !this.isOpen()) {
      return;
    }
    const { accepted, errors } = checkPhotoFiles(Array.from(input.files), MAX_SHARED_UPLOAD);
    input.value = '';
    this.errors.set(errors);
    if (!accepted.length) {
      this.message.set('');
      return;
    }

    // Until the backend exists, photos live in this browser only (object URLs).
    this.data.addSharedPhotos(
      accepted.map((file) => URL.createObjectURL(file)),
      this.guestName().trim(),
    );
    this.message.set(
      accepted.length === 1
        ? 'Thank you! Your photo is in the gallery.'
        : 'Thank you! Your photos are in the gallery.',
    );
  }
}
