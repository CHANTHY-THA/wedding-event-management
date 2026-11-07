import { Guest, SeatingTable } from '../../core/wedding.models';

export interface TableLoad {
  table: SeatingTable;
  parties: Guest[];
  /** Seats taken: confirmed attendees, or the whole party while their RSVP is pending. */
  used: number;
}

export interface SeatingWarning {
  tableId: number;
  message: string;
}

/** Seats a party needs. Declined parties need none and are left out of the chart. */
export function seatsFor(guest: Guest): number {
  if (guest.rsvp === 'Declined') {
    return 0;
  }
  return guest.rsvp === 'Confirmed' ? guest.attendingCount : guest.partySize;
}

/** Parties that still need a seat, largest first so big families are placed early. */
export function unseatedParties(guests: Guest[]): Guest[] {
  return guests
    .filter((guest) => guest.tableId === null && seatsFor(guest) > 0)
    .sort((left, right) => seatsFor(right) - seatsFor(left) || left.name.localeCompare(right.name));
}

export function tableLoads(tables: SeatingTable[], guests: Guest[]): TableLoad[] {
  return tables.map((table) => {
    const parties = guests
      .filter((guest) => guest.tableId === table.id && seatsFor(guest) > 0)
      .sort((left, right) => left.name.localeCompare(right.name));
    return { table, parties, used: parties.reduce((total, guest) => total + seatsFor(guest), 0) };
  });
}

export function seatingWarnings(loads: TableLoad[]): SeatingWarning[] {
  const warnings: SeatingWarning[] = [];
  for (const { table, parties, used } of loads) {
    if (used > table.capacity) {
      warnings.push({
        tableId: table.id,
        message: `${table.name} is over capacity: ${used} guests for ${table.capacity} seats.`,
      });
    }
    const pending = parties.filter((guest) => guest.rsvp === 'Pending');
    if (pending.length) {
      warnings.push({
        tableId: table.id,
        message: `${table.name} has ${pending.map((guest) => guest.name).join(', ')} still waiting to RSVP.`,
      });
    }
  }
  return warnings;
}

/** "Which table am I?" lookup by party name, group or relationship. */
export function findTables(
  guests: Guest[],
  tables: SeatingTable[],
  searchTerm: string,
): { guest: Guest; table: SeatingTable | undefined }[] {
  const query = searchTerm.trim().toLowerCase();
  if (query.length < 2) {
    return [];
  }
  return guests
    .filter(
      (guest) =>
        seatsFor(guest) > 0 &&
        (guest.name.toLowerCase().includes(query) || guest.group.toLowerCase().includes(query)),
    )
    .map((guest) => ({ guest, table: tables.find((table) => table.id === guest.tableId) }));
}
