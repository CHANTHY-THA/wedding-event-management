export type InvitationTemplateId = 'split' | 'overlay' | 'floral' | 'royal';

/**
 * Designs this app can draw (their styles are in styles/_invitation.scss). Names, prices and
 * what a wedding owns come from the API, so prices can change without a new release.
 */
export const TEMPLATE_IDS: InvitationTemplateId[] = ['split', 'overlay', 'floral', 'royal'];

/** Free to every wedding, and what guests see until the couple picks another. */
export const FREE_TEMPLATE_ID: InvitationTemplateId = 'split';

export function isTemplateId(value: unknown): value is InvitationTemplateId {
  return TEMPLATE_IDS.includes(value as InvitationTemplateId);
}

/** A design in the template store, as the signed-in wedding sees it. Prices are in US cents. */
export interface StoreTemplate {
  id: InvitationTemplateId;
  name: string;
  description: string;
  priceCents: number;
  /** Price before the promotion, shown struck through when higher than `priceCents`. */
  listPriceCents: number;
  owned: boolean;
}

export interface TemplateCatalogue {
  templates: StoreTemplate[];
  activeTemplateId: string;
}

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'review';

/** A template purchase. The QR is only present while the order can still be paid. */
export interface TemplateOrder {
  id: number;
  reference: string;
  templateId: InvitationTemplateId;
  amountCents: number;
  currency: 'USD' | 'KHR';
  status: OrderStatus;
  qrString: string | null;
  expiresAt: string;
  paidAt: string | null;
  /** Sandbox provider: no real money moves, and testers can simulate the payment. */
  testMode: boolean;
}
