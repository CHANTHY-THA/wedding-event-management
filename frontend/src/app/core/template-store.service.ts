import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  FREE_TEMPLATE_ID,
  InvitationTemplateId,
  TemplateCatalogue,
  TemplateOrder,
  StoreTemplate,
  isTemplateId,
} from './invitation-templates';

/**
 * The template store as the signed-in wedding sees it. The server decides prices, confirms
 * payments with the bank and records what the wedding owns; this service only shows it.
 */
@Injectable({ providedIn: 'root' })
export class TemplateStoreService {
  private readonly http = inject(HttpClient);

  readonly templates = signal<StoreTemplate[]>([]);
  readonly active = signal<InvitationTemplateId>(FREE_TEMPLATE_ID);
  readonly activeTemplate = computed(
    () => this.templates().find((template) => template.id === this.active()) ?? null,
  );
  readonly loadError = signal('');

  async load(): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.http.get<TemplateCatalogue>('/api/templates')));
      this.loadError.set('');
    } catch {
      this.loadError.set('Could not load the templates. Please try again.');
    }
  }

  isOwned(id: InvitationTemplateId): boolean {
    return this.templates().some((template) => template.id === id && template.owned);
  }

  /** Starts a purchase. The server sets the price and returns the QR to pay. */
  createOrder(templateId: InvitationTemplateId): Promise<TemplateOrder> {
    return firstValueFrom(this.http.post<TemplateOrder>('/api/orders', { templateId }));
  }

  /** The order's latest state; the server asks the payment provider while it is unpaid. */
  getOrder(id: number): Promise<TemplateOrder> {
    return firstValueFrom(this.http.get<TemplateOrder>(`/api/orders/${id}`));
  }

  /** Test mode only: pays the order as if the buyer's bank had. */
  simulatePayment(id: number): Promise<TemplateOrder> {
    return firstValueFrom(this.http.post<TemplateOrder>(`/api/orders/${id}/simulate-payment`, {}));
  }

  /** Shows an owned template to guests. Returns false if the server refused. */
  async use(id: InvitationTemplateId): Promise<boolean> {
    try {
      this.apply(
        await firstValueFrom(
          this.http.put<TemplateCatalogue>('/api/weddings/current/template', { templateId: id }),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  private apply(catalogue: TemplateCatalogue): void {
    // Skip designs the server sells but this version of the app cannot draw yet.
    this.templates.set(catalogue.templates.filter((template) => isTemplateId(template.id)));
    this.active.set(
      isTemplateId(catalogue.activeTemplateId) ? catalogue.activeTemplateId : FREE_TEMPLATE_ID,
    );
  }
}

/** The server's message for a failed request, or `fallback` when it sent none. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof HttpErrorResponse ? error.error?.error : undefined;
  return typeof message === 'string' ? message : fallback;
}
