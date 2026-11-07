import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ROLE_LABELS } from './permissions';
import { UserRole } from './wedding.models';

export interface AdminSession {
  email: string;
  name: string;
  role: UserRole;
  wedding: { id: number; name: string };
}

export type LoginResult = { ok: true } | { ok: false; message: string };

/**
 * The signed-in planner account. The API keeps the session in an HttpOnly cookie, so page
 * scripts never see the token; this service only mirrors who the server says is signed in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private loaded: Promise<void> | null = null;

  readonly session = signal<AdminSession | null>(null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.role ?? null);
  readonly roleLabel = computed(() => {
    const role = this.role();
    return role ? ROLE_LABELS[role] : '';
  });

  /** Asks the server who is signed in, once per page load. Guards wait for this. */
  ensureLoaded(): Promise<void> {
    this.loaded ??= this.isBrowser ? this.fetchSession() : Promise.resolve();
    return this.loaded;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const session = await firstValueFrom(
        this.http.post<AdminSession>('/api/auth/login', { email, password }),
      );
      this.session.set(session);
      this.loaded = Promise.resolve();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: loginErrorMessage(error) };
    }
  }

  logout(): void {
    this.session.set(null);
    // The cookie is cleared by the server; if that fails, the session still expires on its own.
    this.http.post('/api/auth/logout', {}).subscribe({ error: () => undefined });
  }

  private async fetchSession(): Promise<void> {
    try {
      this.session.set(await firstValueFrom(this.http.get<AdminSession>('/api/auth/me')));
    } catch {
      // Not signed in (401) or the API is unreachable: treat both as signed out.
      this.session.set(null);
    }
  }
}

function loginErrorMessage(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (status === 401) {
    return 'That email and password do not match an admin account.';
  }
  if (status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return 'Could not reach the server. Please try again.';
}
