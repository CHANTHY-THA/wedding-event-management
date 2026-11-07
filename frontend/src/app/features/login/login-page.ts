import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ROLE_LABELS, homePathFor } from '../../core/permissions';
import { LanguageToggle } from '../../shared/language-toggle/language-toggle';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { DEMO_ACCOUNTS } from './demo-accounts';

@Component({
  selector: 'app-login-page',
  imports: [TranslatePipe, DatePipe, FormsModule, LanguageToggle],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly data = inject(WeddingDataService);

  protected readonly coupleNames = this.data.coupleNames;
  protected readonly details = this.data.details;
  protected readonly showPassword = signal(false);
  /** One sign-in shortcut per role, so each permission level is easy to try in this preview. */
  protected readonly demoAccounts = DEMO_ACCOUNTS.map((account) => ({
    ...account,
    roleLabel: ROLE_LABELS[account.role],
  }));
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly errorMessage = signal('');
  protected readonly submitting = signal(false);

  protected useDemoAccount(email: string, password: string): void {
    this.email.set(email);
    this.password.set(password);
    this.errorMessage.set('');
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (!this.email().trim() || !this.password()) {
      this.errorMessage.set('Enter your email and password.');
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
