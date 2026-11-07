import { Pipe, PipeTransform, inject } from '@angular/core';
import { KM } from '../../core/i18n/km';
import { LocaleService } from '../../core/locale.service';

/**
 * Translates English UI text into the chosen language: {{ 'Guests' | t }}.
 * Text without a translation falls back to English, so untranslated strings still read fine.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(text: string): string {
    return this.locale.language() === 'km' ? (KM[text] ?? text) : text;
  }
}
