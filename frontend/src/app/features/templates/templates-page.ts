import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { InvitationTemplateId, StoreTemplate } from '../../core/invitation-templates';
import { TemplateStoreService } from '../../core/template-store.service';
import { ToastService } from '../../core/toast.service';
import { WeddingDataService } from '../../core/wedding-data.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TemplateCheckoutDialog } from './template-checkout-dialog';

/** Invitation template store: preview each design, buy it, and choose the one guests see. */
@Component({
  selector: 'app-templates-page',
  imports: [CurrencyPipe, RouterLink, TemplateCheckoutDialog, TranslatePipe],
  templateUrl: './templates-page.html',
  styleUrl: './templates-page.scss',
})
export class TemplatesPage {
  private readonly store = inject(TemplateStoreService);
  private readonly data = inject(WeddingDataService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly toast = inject(ToastService);

  protected readonly templates = this.store.templates;
  protected readonly active = this.store.active;
  protected readonly activeName = computed(() => this.store.activeTemplate()?.name ?? '');
  protected readonly loadError = this.store.loadError;

  /** Previews render the first guest's invitation, so they show the couple's own photo and names. */
  protected readonly previewToken = computed(() => this.data.guests()[0]?.invitationToken ?? '');
  protected readonly previewFrames = computed(() => {
    const token = this.previewToken();
    return new Map<InvitationTemplateId, SafeResourceUrl>(
      this.templates().map((template) => [
        template.id,
        this.sanitizer.bypassSecurityTrustResourceUrl(`/invite/${token}?template=${template.id}`),
      ]),
    );
  });

  protected readonly checkoutTemplate = signal<StoreTemplate | null>(null);

  constructor() {
    void this.store.load();
  }

  protected reload(): void {
    void this.store.load();
  }

  protected async useTemplate(template: StoreTemplate): Promise<void> {
    if (await this.store.use(template.id)) {
      this.toast.show('Your invitation now uses this template');
    } else {
      this.toast.show('Could not change the template. Please try again.', 'danger');
    }
  }
}
