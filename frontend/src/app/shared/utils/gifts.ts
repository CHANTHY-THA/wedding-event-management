import { Currency, GiftRecord, Guest } from '../../core/wedding.models';

export type GiftFilter = 'all' | 'Cash' | 'Gift' | 'unthanked';

/** Cash received per currency, kept separate because riel and dollars are counted apart. */
export function cashTotals(gifts: GiftRecord[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { USD: 0, KHR: 0 };
  for (const gift of gifts) {
    if (gift.type === 'Cash') {
      totals[gift.currency] += gift.amount;
    }
  }
  return totals;
}

export function isValidGift(gift: Omit<GiftRecord, 'id'>): boolean {
  if (!gift.giverName.trim() || !gift.receivedAt) {
    return false;
  }
  return gift.type === 'Cash'
    ? Number.isFinite(gift.amount) && gift.amount > 0
    : gift.item.trim() !== '';
}

export function filterGifts(
  gifts: GiftRecord[],
  searchTerm: string,
  filter: GiftFilter,
): GiftRecord[] {
  const query = searchTerm.trim().toLowerCase();

  return gifts.filter((gift) => {
    const matchesQuery =
      !query ||
      gift.giverName.toLowerCase().includes(query) ||
      gift.item.toLowerCase().includes(query) ||
      gift.notes.toLowerCase().includes(query);
    const matchesFilter =
      filter === 'all' || (filter === 'unthanked' ? !gift.thanked : gift.type === filter);

    return matchesQuery && matchesFilter;
  });
}

/** Quotes a CSV cell and defuses spreadsheet formulas (cells starting with = + - @). */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** CSV of all gifts for thank-you notes and remembering who gave what. */
export function giftsToCsv(gifts: GiftRecord[], guests: Guest[]): string {
  const header = [
    'giver',
    'guestGroup',
    'type',
    'amount',
    'currency',
    'item',
    'receivedAt',
    'recordedBy',
    'thankYouSent',
    'notes',
  ];
  const rows = gifts.map((gift) => {
    const guest = guests.find((entry) => entry.id === gift.guestId);
    return [
      gift.giverName,
      guest?.group ?? '',
      gift.type,
      gift.type === 'Cash' ? gift.amount : '',
      gift.type === 'Cash' ? gift.currency : '',
      gift.item,
      gift.receivedAt,
      gift.recordedBy,
      gift.thanked ? 'yes' : 'no',
      gift.notes,
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
