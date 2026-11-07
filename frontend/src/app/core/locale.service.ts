import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { KHR_PER_USD } from './wedding-seed-data';
import { Currency } from './wedding.models';

export type Language = 'en' | 'km';

const SETTINGS_KEY = 'vows.locale';

interface LocaleSettings {
  language: Language;
  currency: Currency;
}

/** Display language and currency. Amounts are stored in USD unless a record says otherwise. */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);

  readonly language = signal<Language>('en');
  readonly currency = signal<Currency>('USD');
  /** Riel per US dollar. */
  readonly khrPerUsd = signal(KHR_PER_USD);

  constructor() {
    const saved = this.readSettings();
    if (saved) {
      this.language.set(saved.language);
      this.currency.set(saved.currency);
    }
    effect(() => {
      const settings: LocaleSettings = { language: this.language(), currency: this.currency() };
      this.document.documentElement.lang = settings.language;
      this.writeSettings(settings);
    });
  }

  /** Converts an amount between currencies at the current rate. */
  convert(amount: number, from: Currency, to: Currency): number {
    if (from === to) {
      return amount;
    }
    return from === 'USD' ? amount * this.khrPerUsd() : amount / this.khrPerUsd();
  }

  format(amount: number, currency: Currency): string {
    if (currency === 'KHR') {
      // Riel has no coins in use, so round to the nearest 100.
      return `${(Math.round(amount / 100) * 100).toLocaleString('en-US')} ៛`;
    }
    return `$${Math.round(amount).toLocaleString('en-US')}`;
  }

  private readSettings(): LocaleSettings | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const stored = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) ?? 'null',
      ) as Partial<LocaleSettings> | null;
      return stored &&
        (stored.language === 'en' || stored.language === 'km') &&
        (stored.currency === 'USD' || stored.currency === 'KHR')
        ? { language: stored.language, currency: stored.currency }
        : null;
    } catch {
      return null;
    }
  }

  private writeSettings(settings: LocaleSettings): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable; the choice still applies until the page reloads.
    }
  }
}
