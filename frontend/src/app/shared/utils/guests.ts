import { Guest, RsvpStatus } from '../../core/wedding.models';

export type RsvpFilter = 'all' | RsvpStatus;

export const MAX_PARTY_SIZE = 20;

export function isValidParty(partySize: number, plusOnes: number, children: number): boolean {
  return (
    Number.isInteger(partySize) &&
    partySize >= 1 &&
    partySize <= MAX_PARTY_SIZE &&
    Number.isInteger(plusOnes) &&
    plusOnes >= 0 &&
    Number.isInteger(children) &&
    children >= 0 &&
    plusOnes + children <= partySize
  );
}

export function filterGuests(guests: Guest[], searchTerm: string, status: RsvpFilter): Guest[] {
  const query = searchTerm.trim().toLowerCase();

  return guests.filter((guest) => {
    const matchesQuery =
      !query ||
      guest.name.toLowerCase().includes(query) ||
      guest.group.toLowerCase().includes(query) ||
      guest.relationship.toLowerCase().includes(query) ||
      guest.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesStatus = status === 'all' || guest.rsvp === status;

    return matchesQuery && matchesStatus;
  });
}
