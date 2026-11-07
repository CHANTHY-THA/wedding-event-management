import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LocaleService } from '../../core/locale.service';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { WeddingEventRecord } from '../../core/wedding.models';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-events-page',
  imports: [DatePipe, RouterLink, TranslatePipe],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
})
export class EventsPage {
  private readonly data = inject(WeddingDataService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly session = this.auth.session;
  protected readonly language = this.locale.language;
  protected readonly accountMenuOpen = signal(false);
  protected readonly showingArchived = signal(false);
  protected readonly activeMenuId = signal<string | null>(null);
  protected readonly managerEventId = signal<string | null>(null);
  protected readonly deleteEventId = signal<string | null>(null);
  protected readonly managerEmail = signal('');
  protected readonly managerEvent = computed(
    () => this.data.events().find((event) => event.id === this.managerEventId()) ?? null,
  );
  protected readonly eventToDelete = computed(
    () => this.data.events().find((event) => event.id === this.deleteEventId()) ?? null,
  );
  protected readonly events = computed(() =>
    this.data.events().filter((event) => event.archived === this.showingArchived()),
  );
  protected readonly profileInitials = computed(() =>
    (this.session()?.name ?? 'P')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase(),
  );

  protected toggleLanguage(): void {
    this.language.set(this.language() === 'en' ? 'km' : 'en');
  }

  protected logout(): void {
    this.accountMenuOpen.set(false);
    this.auth.logout();
    void this.router.navigateByUrl('/login');
    this.toast.show('You have signed out', 'info');
  }

  protected openCreate(): void {
    void this.router.navigateByUrl('/events/create');
  }

  protected openEvent(event: WeddingEventRecord): void {
    if (!this.data.activateEvent(event.id)) {
      this.toast.show('This event is archived. Restore it to continue.', 'info');
      return;
    }
    void this.router.navigate(['/event', event.id]);
  }

  protected selectEvent(event: WeddingEventRecord): void {
    if (!event.archived) {
      this.data.activateEvent(event.id);
    }
  }

  protected toggleArchive(event: WeddingEventRecord): void {
    if (event.archived) {
      if (this.data.restoreEvent(event.id)) {
        this.toast.show('Event restored');
        this.showingArchived.set(false);
      }
    } else if (this.data.archiveEvent(event.id)) {
      this.toast.show('Event archived', 'info');
    } else {
      this.toast.show('Keep at least one active event.', 'danger');
    }
    this.activeMenuId.set(null);
  }

  protected toggleMenu(id: string): void {
    this.activeMenuId.update((current) => (current === id ? null : id));
  }

  protected editEvent(event: WeddingEventRecord): void {
    this.activeMenuId.set(null);
    void this.router.navigateByUrl(`/events/create?edit=${encodeURIComponent(event.id)}`);
  }

  protected openManagers(event: WeddingEventRecord): void {
    this.activeMenuId.set(null);
    this.managerEmail.set('');
    this.managerEventId.set(event.id);
  }

  protected updateManagerEmail(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.managerEmail.set(target.value);
    }
  }

  protected addManager(): void {
    const event = this.managerEvent();
    if (!event) {
      return;
    }
    if (!this.data.addEventManager(event.id, this.managerEmail())) {
      this.toast.show('Enter a valid, unique email address.', 'danger');
      return;
    }
    this.managerEmail.set('');
    this.toast.show('Manager added');
  }

  protected removeManager(event: WeddingEventRecord, email: string): void {
    if (this.data.removeEventManager(event.id, email)) {
      this.toast.show('Manager removed', 'info');
    }
  }

  protected requestDelete(event: WeddingEventRecord): void {
    this.activeMenuId.set(null);
    this.deleteEventId.set(event.id);
  }

  protected confirmDelete(): void {
    const event = this.eventToDelete();
    if (!event) {
      return;
    }
    if (!this.data.deleteEvent(event.id)) {
      this.toast.show('Event not found.', 'danger');
      return;
    }
    this.deleteEventId.set(null);
    this.toast.show('Event deleted', 'info');
  }
}
