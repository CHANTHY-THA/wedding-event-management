import { Component, effect, input, output, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

/** Renders `value` as a QR code image; emits the PNG data URL so pages can offer a download. */
@Component({
  selector: 'app-qr-code',
  host: { class: 'qr-code' },
  template: `
    @if (dataUrl(); as src) {
      <img [src]="src" [alt]="alt()" [width]="size()" [height]="size()" />
    } @else {
      <span class="qr-placeholder" [style.width.px]="size()" [style.height.px]="size()"></span>
    }
  `,
})
export class QrCode {
  readonly value = input.required<string>();
  readonly size = input(240);
  readonly alt = input('QR code');
  readonly rendered = output<string>();

  protected readonly dataUrl = signal('');

  constructor() {
    effect(() => {
      const value = this.value();
      // Render at 2x so the code stays sharp on phones and when printed.
      toDataURL(value, {
        width: this.size() * 2,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#1d2623', light: '#ffffff' },
      })
        .then((url) => {
          if (value === this.value()) {
            this.dataUrl.set(url);
            this.rendered.emit(url);
          }
        })
        .catch((error: unknown) => console.error('Could not render the QR code.', error));
    });
  }
}
