export type RsvpStatus = 'Confirmed' | 'Pending' | 'Declined';

export interface Guest {
  id: number;
  invitationToken: string;
  name: string;
  group: string;
  initials: string;
  partySize: number;
  attendingCount: number;
  plusOnes: number;
  children: number;
  side: 'Bride' | 'Groom' | 'Shared';
  relationship: string;
  email: string;
  phone: string;
  tags: string[];
  rsvp: RsvpStatus;
  checkedIn: boolean;
  mealChoice: string;
  /** ISO timestamp of the latest RSVP response, if any. */
  respondedAt?: string;
}

export interface NewGuest {
  name: string;
  group: string;
  partySize: number;
  plusOnes: number;
  children: number;
  side: Guest['side'];
  relationship: string;
  email: string;
  phone: string;
  tags: string[];
}

export interface GuestRsvp {
  status: Exclude<RsvpStatus, 'Pending'>;
  attendees: number;
  mealChoice: string;
}

export interface ScheduleItem {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  responsible: string;
}

export type NewScheduleItem = Omit<ScheduleItem, 'id'>;

export interface ScheduleDay {
  date: string;
  items: ScheduleItem[];
}

export interface WeddingPhoto {
  id: number;
  name: string;
  url: string;
}

export interface WeddingMeal {
  name: string;
  description: string;
  dietary: string;
}

export interface WeddingDetails {
  partnerOne: string;
  partnerTwo: string;
  /** ISO date (yyyy-mm-dd) of the main wedding day. */
  date: string;
  venue: string;
  city: string;
  rsvpDeadline: string;
}

export interface BudgetCategory {
  name: string;
  spent: number;
  planned: number;
}

export interface BudgetPayment {
  description: string;
  amount: number;
  dueDate: string;
}

export interface WeddingTask {
  id: number;
  title: string;
  owner: string;
  dueDate: string;
  done: boolean;
}
