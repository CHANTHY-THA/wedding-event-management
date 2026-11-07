import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { filterGuests } from '../../shared/utils/guests';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-check-in-page',
  imports: [TranslatePipe, FormsModule],
  templateUrl: './check-in-page.html',
  styleUrl: './check-in-page.scss',
})
export class CheckInPage {
  private readonly data = inject(WeddingDataService);
  private readonly toast = inject(ToastService);

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
    const guest = this.data.guests().find((entry) => entry.id === id);
    if (guest?.checkedIn) {
      this.toast.show(`Welcome, ${guest.name}! Checked in.`);
    }
  }
}
