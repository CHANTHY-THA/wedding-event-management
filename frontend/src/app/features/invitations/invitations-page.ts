import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_GALLERY_PHOTOS, WeddingDataService } from '../../core/wedding-data.service';
import { Guest } from '../../core/wedding.models';

type ReminderChannel = 'email' | 'sms' | 'whatsapp' | 'telegram';

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 8_000_000;

@Component({
  selector: 'app-invitations-page',
  imports: [RouterLink],
  templateUrl: './invitations-page.html',
  styleUrl: './invitations-page.scss',
})
export class InvitationsPage {
  private readonly data = inject(WeddingDataService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly guests = this.data.guests;
  protected readonly photos = this.data.photos;
  protected readonly invitedCount = this.data.invitedCount;
  protected readonly confirmedCount = this.data.confirmedCount;
  protected readonly pendingCount = this.data.pendingCount;

  protected readonly copyMessage = signal('');
  protected readonly photoMessage = signal('');
  protected readonly remainingPhotoSlots = computed(
    () => MAX_GALLERY_PHOTOS - this.photos().length,
  );

  protected invitePath(token: string): string {
    return `/invite/${encodeURIComponent(token)}`;
  }

  protected async copyInvite(token: string): Promise<void> {
    if (!this.isBrowser || !navigator.clipboard) {
      this.copyMessage.set(
        'Clipboard access is unavailable. Open the invitation to copy its link.',
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(this.inviteUrl(token));
      this.copyMessage.set('Invitation link copied.');
    } catch (error) {
      console.error('Could not copy the invitation link.', error);
      this.copyMessage.set(
        'Could not copy the link. Open the invitation and copy its address instead.',
      );
    }
  }

  protected async uploadPhotos(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }

    const files = Array.from(input.files);
    input.value = '';
    const remaining = this.remainingPhotoSlots();
    if (remaining <= 0) {
      this.photoMessage.set(
        'The invitation gallery is full. Remove a photo before adding another.',
      );
      return;
    }
    const accepted: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        errors.push(`${file.name}: choose a JPG, PNG, or WebP image.`);
      } else if (file.size > MAX_PHOTO_BYTES) {
        errors.push(`${file.name}: the file must be 8 MB or smaller.`);
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length > remaining) {
      errors.push(`The gallery can contain up to ${MAX_GALLERY_PHOTOS} photos.`);
    }
    const toAdd = accepted.slice(0, remaining);
    if (!toAdd.length) {
      this.photoMessage.set(errors.join(' '));
      return;
    }

    this.data.addPhotos(toAdd.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })));
    this.photoMessage.set(
      `Added ${toAdd.length} ${toAdd.length === 1 ? 'photo' : 'photos'} to the invitation.${errors.length ? ` ${errors.join(' ')}` : ''}`,
    );
  }

  protected removePhoto(id: number): void {
    const url = this.data.removePhoto(id);
    if (url) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      this.photoMessage.set('Photo removed from the invitation gallery.');
    }
  }

  protected reminderHref(guest: Guest, channel: ReminderChannel): string {
    const invite = this.inviteUrl(guest.invitationToken);
    const text = `You're invited to ${this.data.coupleNames}'s wedding. RSVP here: ${invite}`;
    const subject = `Your wedding invitation from ${this.data.coupleNames}`;

    switch (channel) {
      case 'email':
        return `mailto:${guest.email ? encodeURIComponent(guest.email) : ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      case 'sms':
        return `sms:${encodeURIComponent(guest.phone)}?body=${encodeURIComponent(text)}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(text)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(invite)}&text=${encodeURIComponent(subject)}`;
    }
  }

  /** Absolute invite URL in the browser; a relative path during server rendering. */
  private inviteUrl(token: string): string {
    const path = this.invitePath(token);
    return this.isBrowser ? new URL(path, window.location.origin).toString() : path;
  }
}
