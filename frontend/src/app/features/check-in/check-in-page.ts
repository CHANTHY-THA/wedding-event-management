import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeddingDataService } from '../../core/wedding-data.service';
import { filterGuests } from '../../shared/utils/guests';

@Component({
  selector: 'app-check-in-page',
  imports: [FormsModule],
  templateUrl: './check-in-page.html',
  styleUrl: './check-in-page.scss',
})
export class CheckInPage {
  private readonly data = inject(WeddingDataService);

  protected readonly confirmedCount = this.data.confirmedCount;
  protected readonly checkedInCount = this.data.checkedInCount;
  protected readonly searchTerm = signal('');
  protected readonly confirmedParties = computed(() =>
    filterGuests(this.data.guests(), this.searchTerm(), 'Confirmed'),
  );
  protected readonly arrivedParties = computed(
    () => this.data.guests().filter((guest) => guest.checkedIn).length,
  );

  protected toggleCheckIn(id: number): void {
    this.data.toggleCheckIn(id);
  }
}
