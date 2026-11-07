import { UserRole } from '../../core/wedding.models';

/**
 * Sign-in shortcuts for the demo accounts that `npm run seed` adds in `backend/`, one per role.
 * Remove them from the login page before going live; the server never seeds them in production.
 */
export const DEMO_ACCOUNTS: { email: string; password: string; name: string; role: UserRole }[] = [
  { email: 'admin@vows.local', password: 'vows-admin', name: 'Simeng & Chanthy', role: 'couple' },
  { email: 'planner@vows.local', password: 'vows-planner', name: 'Malis Chan', role: 'planner' },
  { email: 'staff@vows.local', password: 'vows-staff', name: 'Door team', role: 'staff' },
  { email: 'helper@vows.local', password: 'vows-helper', name: 'Aunt Sreymom', role: 'helper' },
];
