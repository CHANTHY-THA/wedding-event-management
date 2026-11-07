import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, input, output, signal } from '@angular/core';
import { LocaleService } from '../../core/locale.service';
import { KM } from '../../core/i18n/km';
import { Guest } from '../../core/wedding.models';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { QrCode } from '../../shared/qr-code/qr-code';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { englishTime, khmerTime } from '../../shared/utils/khmer-date';

@Component({
  selector: 'app-guest-ticket-dialog',
  imports: [QrCode, TranslatePipe],
  templateUrl: './guest-ticket-dialog.html',
  styleUrl: './guest-ticket-dialog.scss',
})
export class GuestTicketDialog {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LocaleService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly guest = input.required<Guest>();
  readonly closed = output<void>();

  protected readonly details = this.data.details;
  protected readonly settings = this.data.invitation;
  protected readonly isKhmer = computed(() => this.locale.language() === 'km');
  protected readonly coupleNames = computed(() => {
    const { nameOne, nameTwo } = this.settings();
    const { partnerOne, partnerTwo } = this.details;
    const firstName = this.isKhmer() ? nameOne : partnerOne;
    const secondName = this.isKhmer() ? nameTwo : partnerTwo;
    return firstName.trim() && secondName.trim()
      ? `${firstName} & ${secondName}`
      : this.data.coupleNames;
  });
  protected readonly ceremonyDateTime = computed(
    () => `${this.details.date}T${this.settings().ceremonyTime || '17:00'}:00`,
  );
  protected readonly ceremonyTimeText = computed(() => {
    const time = this.settings().ceremonyTime || '17:00';
    return this.isKhmer() ? khmerTime(time) : englishTime(time);
  });
  protected readonly englishDateTime = computed(() => {
    const date = new Date(`${this.details.date}T12:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `${date} · ${englishTime(this.settings().ceremonyTime || '17:00')}`;
  });
  protected readonly missingCoverUrl = signal('');
  protected readonly coverPhotoUrl = computed(() => {
    const url = this.settings().coverPhotoUrl;
    return url && url !== this.missingCoverUrl() ? url : '';
  });
  protected readonly qrDataUrl = signal('');
  protected readonly invitationUrl = computed(() => {
    const origin = this.document.location?.origin ?? '';
    return `${origin}/invite/${encodeURIComponent(this.guest().invitationToken)}`;
  });

  protected onQrRendered(dataUrl: string): void {
    this.qrDataUrl.set(dataUrl);
  }

  protected onCoverError(): void {
    this.missingCoverUrl.set(this.settings().coverPhotoUrl);
  }

  protected downloadTicket(): void {
    const qr = this.qrDataUrl();
    if (!this.isBrowser || !qr) {
      this.toast.show('The ticket QR code is not ready yet. Please try again.', 'danger');
      return;
    }

    const guest = this.guest();
    const coverUrl = this.settings().coverPhotoUrl
      ? new URL(this.settings().coverPhotoUrl, this.document.location?.origin).toString()
      : '';
    const eventTitle =
      this.locale.language() === 'km' ? KM['Wedding Celebration'] : 'Wedding Celebration';
    const ceremonyTimeText = this.ceremonyTimeText();
    const dateTimeText = this.englishDateTime();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="460" height="760" viewBox="0 0 460 760">
        <defs>
          <linearGradient id="paper" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fffaf1"/><stop offset="1" stop-color="#fff"/></linearGradient>
          <linearGradient id="coverFade" x1="0" x2="0" y1="0" y2="1"><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
          <clipPath id="ticketClip"><rect x="18" y="18" width="424" height="724" rx="27"/></clipPath>
        </defs>
        <rect width="460" height="760" rx="32" fill="#f5eee4"/>
        <rect x="18" y="18" width="424" height="724" rx="27" fill="url(#paper)" stroke="#d7dce0" stroke-width="3"/>
        <g clip-path="url(#ticketClip)">
          ${coverUrl ? `<image x="20" y="20" width="420" height="218" preserveAspectRatio="xMidYMid slice" href="${escapeXml(coverUrl)}" xlink:href="${escapeXml(coverUrl)}"/>` : ''}
          <rect x="20" y="20" width="420" height="218" fill="url(#coverFade)"/>
        </g>
        <text x="230" y="244" text-anchor="middle" fill="#bd9258" font-family="Georgia,serif" font-size="25" font-weight="bold">${escapeXml(this.coupleNames())}</text>
        <text x="230" y="283" text-anchor="middle" fill="#29251f" font-family="Georgia,serif" font-size="25" font-weight="bold">${escapeXml(eventTitle)}</text>
        <text x="230" y="312" text-anchor="middle" fill="#b78a50" font-family="Arial,sans-serif" font-size="15">${escapeXml(ceremonyTimeText)}</text>
        <text x="230" y="339" text-anchor="middle" fill="#878b91" font-family="Arial,sans-serif" font-size="14">${escapeXml(dateTimeText)}</text>
        <path d="M20 374h420" stroke="#d7dce0" stroke-width="2" stroke-dasharray="5 7"/>
        <circle cx="18" cy="374" r="13" fill="#f5eee4"/><circle cx="442" cy="374" r="13" fill="#f5eee4"/>
        <text x="230" y="407" text-anchor="middle" fill="#a79b88" font-family="Arial,sans-serif" font-size="13">${escapeXml(this.locale.language() === 'km' ? KM['Dear'] : 'Dear')}</text>
        <text x="230" y="437" text-anchor="middle" fill="#bd9258" font-family="Georgia,serif" font-size="23" font-weight="bold">${escapeXml(guest.name)}</text>
        <path d="M128 457h204v204H128z" fill="#fff" stroke="#e7dfd1" stroke-width="2"/>
        <path d="M128 481v-24h24m156 0h24v24m0 156v24h-24m-156 0h-24v-24" fill="none" stroke="#c5a06b" stroke-width="4"/>
        <image x="147" y="476" width="166" height="166" href="${qr}" xlink:href="${qr}"/>
        <text x="230" y="683" text-anchor="middle" fill="#99969a" font-family="Arial,sans-serif" font-size="13">${escapeXml(this.locale.language() === 'km' ? KM['Scan to open your invitation'] : 'Scan to open your invitation')}</text>
        <text x="230" y="709" text-anchor="middle" fill="#99969a" font-family="Arial,sans-serif" font-size="13">${escapeXml(this.locale.language() === 'km' ? KM['Your invitation to celebrate with us'] : 'Your invitation to celebrate with us')}</text>
      </svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `${safeFilename(guest.name)}-ticket.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.toast.show('Digital ticket downloaded', 'info');
  }

  protected async shareInvitation(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    const url = this.invitationUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Wedding invitation for ${this.guest().name}`,
          text: `You are invited to celebrate ${this.coupleNames}.`,
          url,
        });
        return;
      }
      if (!navigator.clipboard) {
        this.toast.show('Sharing is not available in this browser.', 'danger');
        return;
      }
      await navigator.clipboard.writeText(url);
      this.toast.show('Invitation link copied', 'info');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Could not share the guest invitation.', error);
      this.toast.show('Could not share the invitation. Please try again.', 'danger');
    }
  }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    switch (character) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

function safeFilename(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'guest';
}
