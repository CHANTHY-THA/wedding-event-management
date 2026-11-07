import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { homePathFor } from '../../core/permissions';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-login-page',
  imports: [TranslatePipe, FormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly data = inject(WeddingDataService);

  protected readonly showPassword = signal(false);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly errorMessage = signal('');
  protected readonly submitting = signal(false);

  protected notifyProvider(provider: string): void {
    this.toast.show(`${provider} sign-in is not configured yet.`, 'info');
  }

  protected notifyUnavailable(feature: string): void {
    this.toast.show(`${feature} is not available yet.`, 'info');
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (!this.email().trim() || !this.password()) {
      this.errorMessage.set('Enter your email and password.');
      return;
    }
    if (!this.email().includes('@')) {
      this.errorMessage.set('Phone sign-in is not available yet. Use your account email.');
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');
    const result = await this.auth.login(this.email(), this.password());
    this.submitting.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.message);
      this.password.set('');
      return;
    }
    await this.router.navigateByUrl(this.safeReturnUrl());
    this.toast.show(`Welcome back, ${this.auth.session()?.name ?? 'admin'}`);
  }

  /** Only follow in-app paths so `returnUrl` cannot send the admin to another site. */
  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }
    const role = this.auth.role();
    return role ? homePathFor(role) : '/';
  }
}
