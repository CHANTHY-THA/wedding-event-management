import { Component, model } from '@angular/core';
import { RsvpFilter } from '../utils/guests';

@Component({
  selector: 'app-rsvp-filter-tabs',
  host: { class: 'filter-tabs', 'aria-label': 'Filter guests' },
  template: `
    @for (option of options; track option.value) {
      <button
        type="button"
        [class.selected]="value() === option.value"
        (click)="value.set(option.value)"
      >
        {{ option.label }}
      </button>
    }
  `,
})
export class RsvpFilterTabs {
  readonly value = model<RsvpFilter>('all');

  protected readonly options: { value: RsvpFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Confirmed', label: 'Going' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Declined', label: 'Declined' },
  ];
}
