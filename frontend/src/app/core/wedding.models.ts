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
  /** Seating table the party sits at, or null while unseated. */
  tableId: number | null;
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
  /** Vendors working on this moment (photographer, florist, band...). */
  vendorIds: number[];
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

export interface BudgetExpense {
  id: number;
  name: string;
  vendorId: number | null;
  category: string;
  /** Expected total cost of the item. */
  estimated: number;
  /** Amount paid so far; the payment status is derived from this and `estimated`. */
  paid: number;
  /** ISO date (yyyy-mm-dd) the next payment is due, or '' when no date is set. */
  dueDate: string;
  notes: string;
}

export type NewBudgetExpense = Omit<BudgetExpense, 'id'>;

export type PaymentStatus = 'Unpaid' | 'Partly paid' | 'Paid';

export interface WeddingTask {
  id: number;
  title: string;
  /** Person responsible: a family member, helper or planner. */
  owner: string;
  /** ISO date (yyyy-mm-dd) the task should be finished by. */
  dueDate: string;
  done: boolean;
  notes: string;
}

export type NewWeddingTask = Omit<WeddingTask, 'id' | 'done'>;

export type Currency = 'USD' | 'KHR';

export type GiftType = 'Cash' | 'Gift';

/** A wedding gift or cash envelope. Sensitive: only the couple and family helpers see these. */
export interface GiftRecord {
  id: number;
  /** Guest party who gave it, or null for someone not on the guest list. */
  guestId: number | null;
  giverName: string;
  type: GiftType;
  /** Cash amount in `currency`; 0 for gifts in kind. */
  amount: number;
  currency: Currency;
  /** Description of a gift in kind, e.g. "Silver tea set". */
  item: string;
  /** ISO date (yyyy-mm-dd) it was received. */
  receivedAt: string;
  recordedBy: string;
  thanked: boolean;
  notes: string;
}

export type NewGiftRecord = Omit<GiftRecord, 'id'>;

export interface SeatingTable {
  id: number;
  name: string;
  capacity: number;
}

export type ContractStatus = 'Not started' | 'Sent' | 'Signed';

export interface Vendor {
  id: number;
  name: string;
  service: string;
  contactPerson: string;
  phone: string;
  email: string;
  contractStatus: ContractStatus;
  notes: string;
}

export type NewVendor = Omit<Vendor, 'id'>;

export type UserRole = 'couple' | 'planner' | 'staff' | 'helper';

/** A photo a guest shared through the QR code gallery. */
export interface SharedPhoto {
  id: number;
  url: string;
  /** Name the guest typed, or '' if they stayed anonymous. */
  uploaderName: string;
  /** ISO timestamp of the upload. */
  uploadedAt: string;
  /** Hidden photos stay in the admin view but are not shown to guests. */
  hidden: boolean;
}

/** What the couple can change on the guest invitation card. */
export interface InvitationSettings {
  /** Names as printed on the card (often in Khmer script), in the order shown. */
  nameOne: string;
  nameTwo: string;
  /**
   * Cover photo. A path to a file in `public/` (e.g. `/images/cover.jpg`) survives reloads;
   * '' or a missing file falls back to the first pre-wedding photo.
   */
  coverPhotoUrl: string;
  /** Start of the main ceremony (HH:mm); the countdown runs to this time. */
  ceremonyTime: string;
  /** Lunar calendar date written out, e.g. "ថ្ងៃសៅរ៍ ១២កើត ខែបុស្ស ...". Optional. */
  lunarDate: string;
  /** Full venue address shown under the location. */
  venueAddress: string;
  /** Google Maps (or similar) link; shown as a QR code and a button. */
  mapUrl: string;
  invitationMessage: string;
  thankYouMessage: string;
  /**
   * Bank QR images (e.g. ABA KHQR) for gifts in riel and dollars. Like the music, a path to a
   * file in `public/` (e.g. `/gifts/khqr-riel.png`) survives reloads. '' or a missing file hides
   * that tab, and the whole section when neither loads.
   */
  giftQrKhr: string;
  giftQrUsd: string;
  giftAccountName: string;
  /**
   * Background music, started when the guest taps "Open invitation". A path such as
   * `/music/wedding-song.mp3` (a file in `public/`) survives reloads; uploads only last
   * for this browser session. '' hides the music button.
   */
  musicUrl: string;
  /** Dress code colours as hex values, shown as swatches; empty hides the row. */
  dressCodeColors: string[];
  telegramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
}
