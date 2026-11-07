import { Component, computed, inject, Signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { PageKey, canOpen } from '../../core/permissions';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface NavItem {
  label: string;
  page: PageKey;
  /** SVG path data for a 24×24 line icon. */
  icon: string;
  path: string;
  count?: Signal<number>;
}

const ICONS = {
  dashboard: 'M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z',
  schedule: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  guests:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .8 3 2.8 3 6',
  invitations: 'M3 6h18v12H3zM3 7l9 6 9-6',
  templates: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z',
  checkIn: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  budget: 'M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M16 13h1',
  tasks: 'M10 6h10M10 12h10M10 18h10M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
  seating:
    'M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 3v1M12 18v3M3 11h1M20 11h1M5.6 4.6l.7.7M17.7 4.6l-.7.7',
  gifts:
    'M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1-3-5-4-5-1.5S10 7 12 7zM12 7c1-3 5-4 5-1.5S14 7 12 7z',
  vendors: 'M4 20V9l8-5 8 5v11M9 20v-6h6v6M4 20h16',
  gallery: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 3-3L20 15M15.5 9.5h.01',
};

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private readonly data = inject(WeddingDataService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly locale = inject(LocaleService);

  protected get coupleNames(): string {
    return this.data.coupleNames;
  }
  protected readonly session = this.auth.session;
  protected readonly roleLabel = this.auth.roleLabel;
  protected readonly language = this.locale.language;
  protected readonly currency = this.locale.currency;

  private readonly navItems: NavItem[] = [
    { label: 'Events', page: 'events', icon: ICONS.dashboard, path: '/events' },
    { label: 'Dashboard', page: 'dashboard', icon: ICONS.dashboard, path: '/dashboard' },
    // {
    //   label: 'Schedule',
    //   page: 'schedule',
    //   icon: ICONS.schedule,
    //   path: '/schedule',
    //   count: computed(() => this.data.schedule().length),
    // },
    {
      label: 'Guests',
      page: 'guests',
      icon: ICONS.guests,
      path: '/guests',
      count: this.data.invitedCount,
    },
    {
      label: 'Invitations & RSVP',
      page: 'invitations',
      icon: ICONS.invitations,
      path: '/invitations',
    },
    { label: 'Templates', page: 'templates', icon: ICONS.templates, path: '/templates' },
    // { label: 'Seating', page: 'seating', icon: ICONS.seating, path: '/seating' },
    {
      label: 'Photo gallery',
      page: 'gallery',
      icon: ICONS.gallery,
      path: '/gallery',
      count: computed(() => this.data.sharedPhotos().length),
    },
    // { label: 'Check-in', page: 'checkIn', icon: ICONS.checkIn, path: '/check-in' },
    {
      label: 'Gifts',
      page: 'gifts',
      icon: ICONS.gifts,
      path: '/gifts',
      count: computed(() => this.data.gifts().length),
    },
    {
      label: 'Budget',
      page: 'budget',
      icon: ICONS.budget,
      path: '/budget',
      count: computed(() => this.data.expenses().length),
    },
    // {
    //   label: 'Vendors',
    //   page: 'vendors',
    //   icon: ICONS.vendors,
    //   path: '/vendors',
    //   count: computed(() => this.data.vendors().length),
    // },
    // {
    //   label: 'Tasks',
    //   page: 'tasks',
    //   icon: ICONS.tasks,
    //   path: '/tasks',
    //   count: this.data.openTaskCount,
    // },
  ];
  protected readonly visibleNavItems = computed(() => {
    const role = this.auth.role();
    return role ? this.navItems.filter((item) => canOpen(role, item.page)) : [];
  });

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
    this.toast.show('You have signed out', 'info');
  }
}
