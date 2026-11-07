import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/locale.service';

/** English / Khmer switch for pages without the planner sidebar (login, guest invitation). */
@Component({
  selector: 'app-language-toggle',
  host: { class: 'lang-toggle', role: 'group', 'aria-label': 'Language' },
  template: `
    <button
      type="button"
      [class.selected]="language() === 'en'"
      [attr.aria-pressed]="language() === 'en'"
      (click)="language.set('en')"
    >
      English
    </button>
    <button
      type="button"
      lang="km"
      [class.selected]="language() === 'km'"
      [attr.aria-pressed]="language() === 'km'"
      (click)="language.set('km')"
    >
      ខ្មែរ
    </button>
  `,
})
export class LanguageToggle {
  protected readonly language = inject(LocaleService).language;
}
