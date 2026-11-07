import { UserRole } from './wedding.models';

export const ROLE_LABELS: Record<UserRole, string> = {
  couple: 'Couple',
  planner: 'Planner',
  staff: 'Check-in staff',
  helper: 'Family helper',
};

/** Pages each role may open. Gifts are sensitive, so planners and staff never see them. */
export const PAGE_ROLES = {
  dashboard: ['couple', 'planner'],
  schedule: ['couple', 'planner'],
  guests: ['couple', 'planner'],
  invitations: ['couple', 'planner'],
  templates: ['couple', 'planner'],
  seating: ['couple', 'planner'],
  gallery: ['couple', 'planner'],
  checkIn: ['couple', 'planner', 'staff'],
  gifts: ['couple', 'helper'],
  budget: ['couple', 'planner'],
  vendors: ['couple', 'planner'],
  tasks: ['couple', 'planner', 'helper'],
} satisfies Record<string, UserRole[]>;

export type PageKey = keyof typeof PAGE_ROLES;

const PAGE_PATHS: Record<PageKey, string> = {
  dashboard: '/',
  schedule: '/schedule',
  guests: '/guests',
  invitations: '/invitations',
  templates: '/templates',
  seating: '/seating',
  gallery: '/gallery',
  checkIn: '/check-in',
  gifts: '/gifts',
  budget: '/budget',
  vendors: '/vendors',
  tasks: '/tasks',
};

export function canOpen(role: UserRole, page: PageKey): boolean {
  return (PAGE_ROLES[page] as UserRole[]).includes(role);
}

/** Where a role lands after signing in, or when it opens a page it may not see. */
export function homePathFor(role: UserRole): string {
  const page = (Object.keys(PAGE_PATHS) as PageKey[]).find((key) => canOpen(role, key))!;
  return PAGE_PATHS[page];
}
