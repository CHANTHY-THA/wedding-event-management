import { parseCsv, parseGuestCsv } from './guest-csv';

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes and CRLF line endings', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });

  it('returns null for an unclosed quoted field', () => {
    expect(parseCsv('name\n"Unclosed')).toBeNull();
  });
});

describe('parseGuestCsv', () => {
  it('normalizes headers and maps rows to guests', () => {
    const result = parseGuestCsv('﻿Name,Party Size,side,tags\nJamie Lee,2,groom,VIP; Transport');
    expect(result).toEqual({
      ok: true,
      skipped: 0,
      guests: [
        expect.objectContaining({
          name: 'Jamie Lee',
          group: 'Imported guests',
          partySize: 2,
          side: 'Groom',
          tags: ['VIP', 'Transport'],
        }),
      ],
    });
  });

  it('skips rows with invalid party counts', () => {
    const result = parseGuestCsv('name,partySize,plusOnes\nA,1,2\nB,21,0\nC,2,1');
    expect(result.ok && result.guests.map((guest) => guest.name)).toEqual(['C']);
    expect(result.ok && result.skipped).toBe(2);
  });

  it('requires a name column', () => {
    expect(parseGuestCsv('email\na@example.com').ok).toBe(false);
  });
});
