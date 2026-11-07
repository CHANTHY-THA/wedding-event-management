import { GiftRecord } from '../../core/wedding.models';
import { cashTotals, filterGifts, giftsToCsv } from './gifts';

const gift = (id: number, overrides: Partial<GiftRecord> = {}): GiftRecord => ({
  id,
  guestId: null,
  giverName: `Giver ${id}`,
  type: 'Cash',
  amount: 100,
  currency: 'USD',
  item: '',
  receivedAt: '2026-10-20',
  recordedBy: 'Helper',
  thanked: false,
  notes: '',
  ...overrides,
});

describe('gift utils', () => {
  it('totals cash per currency and ignores gifts in kind', () => {
    expect(
      cashTotals([
        gift(1),
        gift(2, { amount: 200_000, currency: 'KHR' }),
        gift(3, { type: 'Gift', amount: 0, item: 'Vase' }),
      ]),
    ).toEqual({ USD: 100, KHR: 200_000 });
  });

  it('filters gifts still waiting for a thank-you', () => {
    const gifts = [gift(1), gift(2, { thanked: true })];
    expect(filterGifts(gifts, '', 'unthanked').map((entry) => entry.id)).toEqual([1]);
  });

  it('exports CSV with quoting and formula protection', () => {
    const csv = giftsToCsv([gift(1, { giverName: 'Lee, Ann', notes: '=SUM(A1)' })], []);
    const [, row] = csv.split('\r\n');
    expect(row).toBe(`"Lee, Ann",,Cash,100,USD,,2026-10-20,Helper,no,'=SUM(A1)`);
  });
});
