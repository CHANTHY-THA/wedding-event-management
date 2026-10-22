import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeddingDataService } from '../../core/wedding-data.service';
import { GuestFormDialog } from '../../shared/guest-form-dialog/guest-form-dialog';
import { RsvpFilterTabs } from '../../shared/rsvp-filter-tabs/rsvp-filter-tabs';
import { parseGuestCsv } from '../../shared/utils/guest-csv';
import { filterGuests, RsvpFilter } from '../../shared/utils/guests';

const MAX_CSV_BYTES = 2_000_000;

@Component({
  selector: 'app-guests-page',
  imports: [FormsModule, GuestFormDialog, RsvpFilterTabs],
  templateUrl: './guests-page.html',
  styleUrl: './guests-page.scss',
})
export class GuestsPage {
  private readonly data = inject(WeddingDataService);

  protected readonly invitedCount = this.data.invitedCount;

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<RsvpFilter>('all');
  protected readonly isGuestFormOpen = signal(false);
  protected readonly csvMessage = signal('');
  protected readonly filteredGuests = computed(() =>
    filterGuests(this.data.guests(), this.searchTerm(), this.statusFilter()),
  );

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }

  protected async importCsv(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.length) {
      return;
    }
    const file = input.files[0];
    input.value = '';
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.csvMessage.set('Choose a CSV file to import guest records.');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      this.csvMessage.set(
        'The CSV is larger than 2 MB. Split it into smaller files and try again.',
      );
      return;
    }

    let contents: string;
    try {
      contents = await file.text();
    } catch (error) {
      console.error('Could not read the selected guest CSV.', error);
      this.csvMessage.set('The CSV could not be read. Please choose the file again.');
      return;
    }

    const result = parseGuestCsv(contents);
    if (!result.ok) {
      this.csvMessage.set(result.error);
      return;
    }

    const { guests, skipped } = result;
    if (guests.length) {
      this.data.addGuests(guests);
      this.resetFilters();
    }
    this.csvMessage.set(
      guests.length
        ? `Imported ${guests.length} ${guests.length === 1 ? 'party' : 'parties'}${skipped ? `; skipped ${skipped} invalid ${skipped === 1 ? 'row' : 'rows'}.` : '.'}`
        : 'No valid guest rows found. Check names and party-size values in your CSV.',
    );
  }
}
