import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, input, output, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { Guest } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-guest-invite-dialog',
  imports: [TranslatePipe],
  templateUrl: './guest-invite-dialog.html',
  styleUrl: './guest-invite-dialog.scss',
})
export class GuestInviteDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly guest = input.required<Guest>();
  readonly closed = output<void>();
  readonly ticketRequested = output<Guest>();

  protected readonly confirmingReset = signal(false);
  protected readonly invitationToken = signal('');
  protected readonly invitationUrl = computed(() => {
    const path = `/invite/${encodeURIComponent(this.invitationToken() || this.guest().invitationToken)}`;
    const origin = this.document.location?.origin;
    return origin ? new URL(path, origin).toString() : path;
  });
  protected readonly displayedUrl = computed(() => {
    const url = this.invitationUrl();
    return url.length > 39 ? `${url.slice(0, 36)}…` : url;
  });

  protected async copyLink(includeMessage: boolean): Promise<void> {
    if (!this.isBrowser || !navigator.clipboard) {
      this.toast.show('Clipboard access is unavailable in this browser.', 'danger');
      return;
    }

    const text = includeMessage
      ? `You're invited to ${this.data.coupleNames}'s wedding. RSVP here: ${this.invitationUrl()}`
      : this.invitationUrl();
    try {
      await navigator.clipboard.writeText(text);
      this.toast.show(includeMessage ? 'Invitation message copied' : 'Invitation link copied', 'info');
    } catch (error) {
      console.error('Could not copy the guest invitation.', error);
      this.toast.show('Could not copy the invitation. Please try again.', 'danger');
    }
  }

  protected resetInvitation(): void {
    const token = this.data.resetInvitationToken(this.guest().id);
    if (!token) {
      this.toast.show('Could not reset this invitation. Please try again.', 'danger');
      return;
    }
    this.invitationToken.set(token);
    this.confirmingReset.set(false);
    this.toast.show('Invitation link reset', 'info');
  }

  protected openTicket(): void {
    this.ticketRequested.emit({
      ...this.guest(),
      invitationToken: this.invitationToken() || this.guest().invitationToken,
    });
  }
}
