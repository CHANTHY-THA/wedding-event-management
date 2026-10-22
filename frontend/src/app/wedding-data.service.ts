import { Injectable, computed, signal } from '@angular/core';

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
  avatarClass: string;
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

@Injectable({ providedIn: 'root' })
export class WeddingDataService {
  readonly guests = signal<Guest[]>([
    {
      id: 1,
      invitationToken: 'a7d4e2c9f0614b83',
      name: 'Emma & James',
      group: 'Bride’s family',
      initials: 'EJ',
      partySize: 2,
      attendingCount: 2,
      plusOnes: 0,
      children: 0,
      side: 'Bride',
      relationship: 'Cousins',
      email: 'emma@example.com',
      phone: '+85512345678',
      tags: ['VIP'],
      rsvp: 'Confirmed',
      checkedIn: false,
      mealChoice: 'Vegetarian',
      avatarClass: 'avatar-rose',
    },
    {
      id: 2,
      invitationToken: 'b19f3a06d5e748c2',
      name: 'Sarah Martin',
      group: 'College friends',
      initials: 'SM',
      partySize: 1,
      attendingCount: 1,
      plusOnes: 0,
      children: 0,
      side: 'Bride',
      relationship: 'Friend',
      email: 'sarah@example.com',
      phone: '+85512345679',
      tags: [],
      rsvp: 'Confirmed',
      checkedIn: true,
      mealChoice: 'Chicken',
      avatarClass: 'avatar-lilac',
    },
    {
      id: 3,
      invitationToken: 'c6e24d801a7f49b3',
      name: 'The Chen Family',
      group: 'Groom’s family',
      initials: 'C',
      partySize: 4,
      attendingCount: 4,
      plusOnes: 0,
      children: 2,
      side: 'Groom',
      relationship: 'Aunt & family',
      email: 'chen@example.com',
      phone: '+85512345680',
      tags: ['Kids meal', 'Transport'],
      rsvp: 'Confirmed',
      checkedIn: false,
      mealChoice: 'Chicken',
      avatarClass: 'avatar-mint',
    },
    {
      id: 4,
      invitationToken: 'd0385b2a9e6147fc',
      name: 'David & Lina',
      group: 'Work friends',
      initials: 'DL',
      partySize: 2,
      attendingCount: 0,
      plusOnes: 0,
      children: 0,
      side: 'Shared',
      relationship: 'Colleagues',
      email: 'david@example.com',
      phone: '+85512345681',
      tags: [],
      rsvp: 'Pending',
      checkedIn: false,
      mealChoice: '',
      avatarClass: 'avatar-sand',
    },
    {
      id: 5,
      invitationToken: 'e7a203f1486d4b95',
      name: 'Olivia Chen',
      group: 'College friends',
      initials: 'OC',
      partySize: 1,
      attendingCount: 1,
      plusOnes: 0,
      children: 0,
      side: 'Bride',
      relationship: 'Friend',
      email: 'olivia@example.com',
      phone: '',
      tags: ['Gluten-free'],
      rsvp: 'Confirmed',
      checkedIn: true,
      mealChoice: 'Fish',
      avatarClass: 'avatar-blue',
    },
    {
      id: 6,
      invitationToken: 'f51b8c3472d04ea6',
      name: 'Noah Wilson',
      group: 'Groom’s friends',
      initials: 'NW',
      partySize: 2,
      attendingCount: 0,
      plusOnes: 1,
      children: 0,
      side: 'Groom',
      relationship: 'Friend',
      email: 'noah@example.com',
      phone: '+85512345682',
      tags: [],
      rsvp: 'Declined',
      checkedIn: false,
      mealChoice: '',
      avatarClass: 'avatar-peach',
    },
    {
      id: 7,
      invitationToken: '016c9a72e53d4fb8',
      name: 'Harper & Lucas',
      group: 'Bride’s friends',
      initials: 'HL',
      partySize: 2,
      attendingCount: 2,
      plusOnes: 0,
      children: 0,
      side: 'Bride',
      relationship: 'Friends',
      email: 'harper@example.com',
      phone: '',
      tags: ['Accommodation'],
      rsvp: 'Confirmed',
      checkedIn: false,
      mealChoice: 'Vegetarian',
      avatarClass: 'avatar-lilac',
    },
    {
      id: 8,
      invitationToken: '28d0e54f61a749bc',
      name: 'The Miller Family',
      group: 'Family friends',
      initials: 'M',
      partySize: 3,
      attendingCount: 0,
      plusOnes: 0,
      children: 1,
      side: 'Shared',
      relationship: 'Family friends',
      email: 'miller@example.com',
      phone: '+85512345683',
      tags: ['Kids meal'],
      rsvp: 'Pending',
      checkedIn: false,
      mealChoice: '',
      avatarClass: 'avatar-rose',
    },
  ]);

  readonly schedule = signal<ScheduleItem[]>([
    {
      id: 1,
      title: 'Welcome & family blessing',
      type: 'Ceremony',
      date: '2026-10-24',
      time: '09:00',
      endTime: '10:00',
      location: 'Rosewood Garden · Lotus Hall',
      responsible: 'Dara Sok',
    },
    {
      id: 2,
      title: 'Traditional Khmer ceremony',
      type: 'Ceremony',
      date: '2026-10-24',
      time: '10:30',
      endTime: '12:00',
      location: 'Rosewood Garden · Courtyard',
      responsible: 'Malis Chan',
    },
    {
      id: 3,
      title: 'Lunch reception',
      type: 'Reception',
      date: '2026-10-24',
      time: '12:30',
      endTime: '14:30',
      location: 'Rosewood Garden · Orchid Room',
      responsible: 'James Bennett',
    },
    {
      id: 4,
      title: 'Evening celebration',
      type: 'Reception',
      date: '2026-10-24',
      time: '18:00',
      endTime: '23:00',
      location: 'Rosewood Garden · Main Lawn',
      responsible: 'Sophia Bennett',
    },
  ]);

  readonly photos = signal<WeddingPhoto[]>([
    {
      id: 1,
      name: 'Sample pre-wedding illustration',
      url: '/images/pre-wedding-preview.svg',
    },
  ]);
  readonly meals: WeddingMeal[] = [
    {
      name: 'Chicken',
      description: 'Herb-roasted chicken with seasonal vegetables and garden rice.',
      dietary: 'Contains poultry',
    },
    {
      name: 'Fish',
      description: 'Gently grilled fish with fresh herbs and a bright citrus dressing.',
      dietary: 'Contains fish',
    },
    {
      name: 'Vegetarian',
      description: 'A colorful seasonal vegetable plate with fragrant garden rice.',
      dietary: 'Vegetarian',
    },
    {
      name: 'Vegan',
      description: 'A plant-based seasonal plate prepared without animal products.',
      dietary: 'Vegan',
    },
  ];

  readonly invitedCount = computed(() =>
    this.guests().reduce((total, guest) => total + guest.partySize, 0),
  );
  readonly confirmedCount = computed(() =>
    this.guests()
      .filter((guest) => guest.rsvp === 'Confirmed')
      .reduce((total, guest) => total + guest.attendingCount, 0),
  );
  readonly pendingCount = computed(() =>
    this.guests()
      .filter((guest) => guest.rsvp === 'Pending')
      .reduce((total, guest) => total + guest.partySize, 0),
  );
  readonly checkedInCount = computed(() =>
    this.guests()
      .filter((guest) => guest.checkedIn)
      .reduce((total, guest) => total + guest.attendingCount, 0),
  );

  addGuest(details: NewGuest): Guest {
    const guest: Guest = {
      ...details,
      id: Math.max(0, ...this.guests().map((entry) => entry.id)) + 1,
      invitationToken: crypto.randomUUID().replaceAll('-', ''),
      initials: details.name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase(),
      rsvp: 'Pending',
      attendingCount: 0,
      checkedIn: false,
      mealChoice: '',
      avatarClass: 'avatar-rose',
    };
    this.guests.update((guests) => [guest, ...guests]);
    return guest;
  }

  addGuests(guests: NewGuest[]): void {
    for (const guest of guests) {
      this.addGuest(guest);
    }
  }

  updateRsvp(token: string, response: GuestRsvp): boolean {
    const guest = this.findGuestByToken(token);
    if (
      !guest ||
      !Number.isInteger(response.attendees) ||
      response.attendees < 1 ||
      response.attendees > guest.partySize
    ) {
      return false;
    }

    this.guests.update((guests) =>
      guests.map((entry) =>
        entry.invitationToken === token
          ? {
              ...entry,
              rsvp: response.status,
              attendingCount: response.status === 'Confirmed' ? response.attendees : 0,
              checkedIn: false,
              mealChoice: response.status === 'Confirmed' ? response.mealChoice : '',
            }
          : entry,
      ),
    );
    return true;
  }

  findGuestByToken(token: string): Guest | undefined {
    return this.guests().find((guest) => guest.invitationToken === token);
  }

  toggleCheckIn(id: number): void {
    this.guests.update((guests) =>
      guests.map((guest) =>
        guest.id === id && guest.rsvp === 'Confirmed'
          ? { ...guest, checkedIn: !guest.checkedIn }
          : guest,
      ),
    );
  }

  addScheduleItem(item: Omit<ScheduleItem, 'id'>): void {
    this.schedule.update((items) => [
      ...items,
      { ...item, id: Math.max(0, ...items.map((entry) => entry.id)) + 1 },
    ]);
  }

  addPhotos(photos: Omit<WeddingPhoto, 'id'>[]): void {
    this.photos.update((current) => [
      ...current,
      ...photos.map((photo, index) => ({
        ...photo,
        id: Math.max(0, ...current.map((entry) => entry.id)) + index + 1,
      })),
    ]);
  }

  removePhoto(id: number): string | undefined {
    const photo = this.photos().find((entry) => entry.id === id);
    if (photo) {
      this.photos.update((photos) => photos.filter((entry) => entry.id !== id));
    }
    return photo?.url;
  }
}
