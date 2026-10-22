import { Routes } from '@angular/router';
import { DashboardLayout } from './layout/dashboard-layout/dashboard-layout';

export const routes: Routes = [
  {
    path: 'invite/:token',
    title: 'You are invited',
    loadComponent: () =>
      import('./features/guest-invitation/guest-invitation-page').then(
        (m) => m.GuestInvitationPage,
      ),
  },
  {
    path: '',
    component: DashboardLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · Vows',
        loadComponent: () =>
          import('./features/overview/overview-page').then((m) => m.OverviewPage),
      },
      {
        path: 'schedule',
        title: 'Event schedule · Vows',
        loadComponent: () =>
          import('./features/schedule/schedule-page').then((m) => m.SchedulePage),
      },
      {
        path: 'guests',
        title: 'Guest management · Vows',
        loadComponent: () => import('./features/guests/guests-page').then((m) => m.GuestsPage),
      },
      {
        path: 'check-in',
        title: 'Check-in · Vows',
        loadComponent: () => import('./features/check-in/check-in-page').then((m) => m.CheckInPage),
      },
      {
        path: 'invitations',
        title: 'Invitations & RSVP · Vows',
        loadComponent: () =>
          import('./features/invitations/invitations-page').then((m) => m.InvitationsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
