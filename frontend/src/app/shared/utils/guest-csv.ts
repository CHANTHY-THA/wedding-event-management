import { NewGuest } from '../../core/wedding.models';
import { isValidParty } from './guests';

export type GuestCsvResult =
  { ok: true; guests: NewGuest[]; skipped: number } | { ok: false; error: string };

/** Parses guest rows from CSV text. Rows with a missing name or invalid party counts are skipped. */
export function parseGuestCsv(contents: string): GuestCsvResult {
  const rows = parseCsv(contents);
  if (rows === null) {
    return {
      ok: false,
      error: 'The CSV has an unclosed quoted field. Check the quotation marks and try again.',
    };
  }
  if (!rows.length) {
    return { ok: false, error: 'The CSV is empty.' };
  }

  const headers = rows[0].map((header) =>
    header
      .trim()
      .replace(/^﻿/, '')
      .toLowerCase()
      .replace(/[\s_-]/g, ''),
  );
  if (!headers.includes('name')) {
    return {
      ok: false,
      error: 'The CSV needs a "name" header. See the example columns above the import button.',
    };
  }

  const read = (row: string[], key: string): string => {
    const index = headers.indexOf(key);
    return index < 0 ? '' : (row[index] ?? '').trim();
  };
  const guests: NewGuest[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    if (row.every((value) => !value.trim())) {
      continue;
    }
    const partySize = Number(read(row, 'partysize') || 1);
    const plusOnes = Number(read(row, 'plusones') || 0);
    const children = Number(read(row, 'children') || 0);
    if (!read(row, 'name') || !isValidParty(partySize, plusOnes, children)) {
      skipped++;
      continue;
    }
    const side = read(row, 'side').toLowerCase();
    guests.push({
      name: read(row, 'name'),
      group: read(row, 'group') || 'Imported guests',
      partySize,
      plusOnes,
      children,
      side: side === 'bride' ? 'Bride' : side === 'groom' ? 'Groom' : 'Shared',
      relationship: read(row, 'relationship'),
      email: read(row, 'email'),
      phone: read(row, 'phone'),
      tags: read(row, 'tags')
        .split(';')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
  }
  return { ok: true, guests, skipped };
}

/** Minimal RFC 4180 parser. Returns null when a quoted field is never closed. */
export function parseCsv(input: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < input.length; index++) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') {
        index++;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) {
    return null;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
