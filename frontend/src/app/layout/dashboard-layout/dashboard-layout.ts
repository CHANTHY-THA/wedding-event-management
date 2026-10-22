import { Component, computed, inject, Signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WeddingDataService } from '../../core/wedding-data.service';

interface NavItem {
  label: string;
  path: string;
  fragment?: string;
  count?: Signal<number>;
}

@Component({
  selector: 'app-dashboard-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard-layout.html',
})
export class DashboardLayout {
  private readonly data = inject(WeddingDataService);

  protected readonly coupleNames = this.data.coupleNames;
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/' },
    {
      label: 'Schedule',
      path: '/schedule',
      count: computed(() => this.data.schedule().length),
    },
    { label: 'Guests', path: '/guests', count: this.data.invitedCount },
    { label: 'Invitations & RSVP', path: '/invitations' },
    { label: 'Check-in', path: '/check-in' },
    { label: 'Budget', path: '/', fragment: 'budget' },
    { label: 'Tasks', path: '/', fragment: 'tasks' },
  ];
}
