import { Guest, SeatingTable } from '../../core/wedding.models';
import { findTables, seatingWarnings, seatsFor, tableLoads, unseatedParties } from './seating';

const guest = (id: number, overrides: Partial<Guest> = {}): Guest => ({
  id,
  invitationToken: `t${id}`,
  name: `Party ${id}`,
  group: 'Friends',
  initials: 'P',
  partySize: 4,
  attendingCount: 2,
  plusOnes: 0,
  children: 0,
  side: 'Shared',
  relationship: '',
  email: '',
  phone: '',
  tags: [],
  rsvp: 'Confirmed',
  checkedIn: false,
  mealChoice: '',
  tableId: null,
  ...overrides,
});

const tables: SeatingTable[] = [{ id: 1, name: 'Table 1', capacity: 4 }];

describe('seating utils', () => {
  it('counts seats from the RSVP', () => {
    expect(seatsFor(guest(1))).toBe(2);
    expect(seatsFor(guest(1, { rsvp: 'Pending' }))).toBe(4);
    expect(seatsFor(guest(1, { rsvp: 'Declined' }))).toBe(0);
  });

  it('lists unseated parties largest first and skips declined ones', () => {
    const parties = unseatedParties([
      guest(1),
      guest(2, { rsvp: 'Pending' }),
      guest(3, { rsvp: 'Declined' }),
      guest(4, { tableId: 1 }),
    ]);
    expect(parties.map((entry) => entry.id)).toEqual([2, 1]);
  });

  it('warns about full tables and pending RSVPs', () => {
    const loads = tableLoads(tables, [
      guest(1, { tableId: 1 }),
      guest(2, { tableId: 1, rsvp: 'Pending', name: 'The Millers' }),
    ]);
    expect(loads[0].used).toBe(6);
    expect(seatingWarnings(loads).map((warning) => warning.message)).toEqual([
      'Table 1 is over capacity: 6 guests for 4 seats.',
      'Table 1 has The Millers still waiting to RSVP.',
    ]);
  });

  it('finds which table a guest sits at', () => {
    const results = findTables([guest(1, { name: 'Emma & James', tableId: 1 })], tables, 'emma');
    expect(results.map((result) => result.table?.name)).toEqual(['Table 1']);
  });
});
