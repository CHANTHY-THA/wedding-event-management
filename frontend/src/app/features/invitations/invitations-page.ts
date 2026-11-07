import { isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_GALLERY_PHOTOS, WeddingDataService } from '../../core/wedding-data.service';
import { Guest } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { checkPhotoFiles } from '../../shared/utils/photos';
import { InvitationDesignDialog } from './invitation-design-dialog';

type ReminderChannel = 'email' | 'sms' | 'whatsapp' | 'telegram';

@Component({
  selector: 'app-invitations-page',
  imports: [TranslatePipe, RouterLink, InvitationDesignDialog],
  templateUrl: './invitations-page.html',
  styleUrl: './invitations-page.scss',
})
export class InvitationsPage {
  private readonly data = inject(WeddingDataService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly guests = this.data.guests;
  protected readonly photos = this.data.availablePhotos;
  /** Album files not added to public/images/gallery yet. */
  protected readonly missingPhotoCount = computed(
    () => this.data.photos().length - this.data.availablePhotos().length,
  );
  protected readonly invitedCount = this.data.invitedCount;
  protected readonly confirmedCount = this.data.confirmedCount;
  protected readonly pendingCount = this.data.pendingCount;

  protected readonly invitation = this.data.invitation;
  protected readonly isDesignOpen = signal(false);
  /** Any guest's link works as a preview of the shared card design. */
  protected readonly previewPath = computed(() => {
    const guest = this.guests()[0];
    return guest ? this.invitePath(guest.invitationToken) : null;
  });

  /** Whether the invitation music file actually loads, so a missing file is obvious here. */
  protected readonly musicStatus = signal<'none' | 'checking' | 'ok' | 'missing'>('none');
  /** The cover file could not be loaded, so guests see the first pre-wedding photo instead. */
  protected readonly coverMissing = signal(false);
  protected readonly coverPreview = computed(() => {
    const cover = this.invitation().coverPhotoUrl;
    return (cover && !this.coverMissing() ? cover : '') || this.photos()[0]?.url || '';
  });
  /** Gift QR image paths that could not be loaded (the file has not been added yet). */
  protected readonly missingGiftQrs = signal<string[]>([]);
  protected readonly giftQrStatus = computed<'none' | 'ok' | 'missing'>(() => {
    const { giftQrKhr, giftQrUsd } = this.invitation();
    if (!giftQrKhr && !giftQrUsd) {
      return 'none';
    }
    return this.missingGiftQrs().length ? 'missing' : 'ok';
  });

  protected readonly copyMessage = signal('');

  constructor() {
    effect((onCleanup) => {
      const url = this.invitation().musicUrl;
      if (!url) {
        this.musicStatus.set('none');
        return;
      }
      if (!this.isBrowser) {
        return;
      }
      this.musicStatus.set('checking');
      const probe = new Audio();
      const ok = () => this.musicStatus.set('ok');
      const missing = () => this.musicStatus.set('missing');
      probe.addEventListener('loadedmetadata', ok);
      probe.addEventListener('error', missing);
      probe.preload = 'metadata';
      probe.src = url;
      onCleanup(() => {
        probe.removeEventListener('loadedmetadata', ok);
        probe.removeEventListener('error', missing);
        probe.removeAttribute('src');
      });
    });

    effect((onCleanup) => {
      const url = this.invitation().coverPhotoUrl;
      this.coverMissing.set(false);
      if (!url || !this.isBrowser) {
        return;
      }
      let active = true;
      const image = new Image();
      image.onerror = () => active && this.coverMissing.set(true);
      image.src = url;
      onCleanup(() => (active = false));
    });

    effect((onCleanup) => {
      const urls = [this.invitation().giftQrKhr, this.invitation().giftQrUsd].filter(Boolean);
      this.missingGiftQrs.set([]);
      if (!this.isBrowser) {
        return;
      }
      let active = true;
      for (const url of urls) {
        const image = new Image();
        image.onerror = () => {
          if (active) {
            this.missingGiftQrs.update((missing) => [...missing, url]);
          }
        };
        image.src = url;
      }
      onCleanup(() => (active = false));
    });
  }
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
    const { accepted: toAdd, errors } = checkPhotoFiles(files, remaining);
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
