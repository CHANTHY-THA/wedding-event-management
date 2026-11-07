import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { InvitationSettings } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { checkPhotoFiles } from '../../shared/utils/photos';

type TextField = Exclude<keyof InvitationSettings, 'dressCodeColors'>;

const MAX_DRESS_CODE_COLORS = 6;
type ImageField = 'coverPhotoUrl' | 'giftQrKhr' | 'giftQrUsd';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav'];
const MAX_AUDIO_BYTES = 15_000_000;

/** Edit everything shown on the guest invitation card. */
@Component({
  selector: 'app-invitation-design-dialog',
  imports: [FormsModule, NgTemplateOutlet, TranslatePipe],
  templateUrl: './invitation-design-dialog.html',
  styleUrl: './invitation-design-dialog.scss',
})
export class InvitationDesignDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();

  protected readonly draft = linkedSignal<InvitationSettings>(() => ({
    ...this.data.invitation(),
  }));
  protected readonly uploadError = signal('');

  protected updateText(field: TextField, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      this.draft.update((draft) => ({ ...draft, [field]: target.value }));
    }
  }

  protected chooseImage(field: ImageField, event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }
    const { accepted, errors } = checkPhotoFiles(Array.from(input.files), 1);
    input.value = '';
    this.uploadError.set(errors.join(' '));
    if (accepted.length) {
      this.draft.update((draft) => ({ ...draft, [field]: URL.createObjectURL(accepted[0]) }));
    }
  }

  protected chooseMusic(event: Event): void {
    const input = event.target;
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file || !(input instanceof HTMLInputElement)) {
      return;
    }
    input.value = '';
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      this.uploadError.set(`${file.name}: choose an MP3, M4A, OGG, or WAV file.`);
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      this.uploadError.set(`${file.name}: the file must be 15 MB or smaller.`);
      return;
    }
    this.uploadError.set('');
    this.draft.update((draft) => ({ ...draft, musicUrl: URL.createObjectURL(file) }));
  }

  protected readonly maxColors = MAX_DRESS_CODE_COLORS;

  protected setColor(index: number, event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.draft.update((draft) => ({
        ...draft,
        dressCodeColors: draft.dressCodeColors.map((color, i) =>
          i === index ? target.value : color,
        ),
      }));
    }
  }

  protected addColor(): void {
    this.draft.update((draft) => ({
      ...draft,
      dressCodeColors: [...draft.dressCodeColors, '#c5a065'].slice(0, MAX_DRESS_CODE_COLORS),
    }));
  }

  protected removeColor(index: number): void {
    this.draft.update((draft) => ({
      ...draft,
      dressCodeColors: draft.dressCodeColors.filter((_, i) => i !== index),
    }));
  }

  protected clear(field: ImageField | 'musicUrl'): void {
    this.draft.update((draft) => ({ ...draft, [field]: '' }));
  }

  protected save(): void {
    const draft = this.draft();
    const trimmed = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.trim() : value,
      ]),
    ) as unknown as InvitationSettings;
    this.data.updateInvitation({
      ...trimmed,
      ceremonyTime: trimmed.ceremonyTime || '09:00',
    });
    this.toast.show('Invitation design saved');
    this.closed.emit();
  }
}
