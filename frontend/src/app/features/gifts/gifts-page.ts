import { DatePipe, DecimalPipe, DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocaleService } from '../../core/locale.service';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { GiftRecord } from '../../core/wedding.models';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { GiftFilter, cashTotals, filterGifts, giftsToCsv } from '../../shared/utils/gifts';
import { GiftFormDialog } from './gift-form-dialog';

@Component({
  selector: 'app-gifts-page',
  imports: [DatePipe, DecimalPipe, FormsModule, MoneyPipe, TranslatePipe, GiftFormDialog],
  templateUrl: './gifts-page.html',
  styleUrl: './gifts-page.scss',
})
export class GiftsPage {
  private readonly data = inject(WeddingDataService);
  private readonly locale = inject(LocaleService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  protected readonly gifts = this.data.gifts;
  protected readonly totals = computed(() => cashTotals(this.gifts()));
  protected readonly combinedUsdTotal = computed(() => {
    const totals = this.totals();
    return totals.USD + this.locale.convert(totals.KHR, 'KHR', 'USD');
  });
  protected readonly khrPerUsd = this.locale.khrPerUsd;
  protected readonly giftCount = computed(
    () => this.gifts().filter((gift) => gift.type === 'Gift').length,
  );
  protected readonly unthankedCount = computed(
    () => this.gifts().filter((gift) => !gift.thanked).length,
  );

  protected readonly filterOptions: { value: GiftFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Gift', label: 'Gifts' },
    { value: 'unthanked', label: 'To thank' },
  ];
  protected readonly searchTerm = signal('');
  protected readonly filter = signal<GiftFilter>('all');
  protected readonly filteredGifts = computed(() =>
    filterGifts(this.gifts(), this.searchTerm(), this.filter()).sort(
      (left, right) => right.receivedAt.localeCompare(left.receivedAt) || right.id - left.id,
    ),
  );

  protected readonly isFormOpen = signal(false);
  /** The gift being edited, or null when recording a new one. */
  protected readonly editingGift = signal<GiftRecord | null>(null);

  protected guestGroup(gift: GiftRecord): string {
    return this.data.guests().find((guest) => guest.id === gift.guestId)?.group ?? '';
  }

  protected toggleThanked(gift: GiftRecord): void {
    this.data.toggleGiftThanked(gift.id);
    if (!gift.thanked) {
      this.toast.show(`Thank-you to ${gift.giverName} marked as sent`);
    }
  }

  protected openForm(gift: GiftRecord | null): void {
    this.editingGift.set(gift);
    this.isFormOpen.set(true);
  }

  protected exportCsv(): void {
    const csv = giftsToCsv(this.gifts(), this.data.guests());
    // A byte-order mark lets Excel open the file as UTF-8, so Khmer names stay readable.
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `wedding-gifts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast.show('Gift list exported', 'info');
  }
}
