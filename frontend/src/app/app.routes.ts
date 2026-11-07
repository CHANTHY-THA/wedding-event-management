import { Routes } from '@angular/router';
import { authGuard, roleGuard, signedOutGuard } from './core/auth.guard';
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
    path: 'share/:code',
    title: 'Share your photos',
    loadComponent: () =>
      import('./features/photo-share/photo-share-page').then((m) => m.PhotoSharePage),
  },
  {
    path: 'login',
    title: 'Sign in · Vows',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: DashboardLayout,
    canActivate: [authGuard],
    canActivateChild: [roleGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · Vows',
        data: { page: 'dashboard' },
        loadComponent: () =>
          import('./features/overview/overview-page').then((m) => m.OverviewPage),
      },
      {
        path: 'schedule',
        title: 'Event schedule · Vows',
        data: { page: 'schedule' },
        loadComponent: () =>
          import('./features/schedule/schedule-page').then((m) => m.SchedulePage),
      },
      {
        path: 'guests',
        title: 'Guest management · Vows',
        data: { page: 'guests' },
        loadComponent: () => import('./features/guests/guests-page').then((m) => m.GuestsPage),
      },
      {
        path: 'invitations',
        title: 'Invitations & RSVP · Vows',
        data: { page: 'invitations' },
        loadComponent: () =>
          import('./features/invitations/invitations-page').then((m) => m.InvitationsPage),
      },
      {
        path: 'templates',
        title: 'Invitation templates · Vows',
        data: { page: 'templates' },
        loadComponent: () =>
          import('./features/templates/templates-page').then((m) => m.TemplatesPage),
      },
      {
        path: 'seating',
        title: 'Seating chart · Vows',
        data: { page: 'seating' },
        loadComponent: () => import('./features/seating/seating-page').then((m) => m.SeatingPage),
      },
      {
        path: 'gallery',
        title: 'Guest photo gallery · Vows',
        data: { page: 'gallery' },
        loadComponent: () => import('./features/gallery/gallery-page').then((m) => m.GalleryPage),
      },
      {
        path: 'check-in',
        title: 'Check-in · Vows',
        data: { page: 'checkIn' },
        loadComponent: () => import('./features/check-in/check-in-page').then((m) => m.CheckInPage),
      },
      {
        path: 'gifts',
        title: 'Gifts & envelopes · Vows',
        data: { page: 'gifts' },
        loadComponent: () => import('./features/gifts/gifts-page').then((m) => m.GiftsPage),
      },
      {
        path: 'budget',
        title: 'Budget · Vows',
        data: { page: 'budget' },
        loadComponent: () => import('./features/budget/budget-page').then((m) => m.BudgetPage),
      },
      {
        path: 'vendors',
        title: 'Vendors · Vows',
        data: { page: 'vendors' },
        loadComponent: () => import('./features/vendors/vendors-page').then((m) => m.VendorsPage),
      },
      {
        path: 'tasks',
        title: 'Planning checklist · Vows',
        data: { page: 'tasks' },
        loadComponent: () => import('./features/tasks/tasks-page').then((m) => m.TasksPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
