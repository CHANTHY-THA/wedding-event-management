export type Currency = 'USD' | 'KHR';

export interface PaymentRequest {
  /** Our order reference (VW-...), shown in the buyer's bank app where the provider allows. */
  reference: string;
  amountCents: number;
  currency: Currency;
  expiresAt: Date;
}

export interface CreatedPayment {
  /** The provider's id for this payment, used to look it up later (KHQR md5, PayWay tran_id). */
  providerRef: string;
  /** What the buyer scans: a KHQR string with the amount built in. */
  qrString: string;
}

/** What the provider reports. `raw` is kept in payment_events for audits. */
export type PaymentCheck =
  | { status: 'pending'; raw?: unknown }
  | { status: 'paid'; amountCents: number; currency: Currency; raw?: unknown }
  | { status: 'failed'; raw?: unknown };

/**
 * A way to take payments (Bakong KHQR, ABA PayWay...). The order logic only talks to this, so
 * providers can be swapped without touching how orders are created, checked or granted.
 */
export interface PaymentProvider {
  readonly name: string;
  /** No real money moves; testers may simulate payments. Never true in production. */
  readonly testMode: boolean;
  createPayment(request: PaymentRequest): Promise<CreatedPayment>;
  checkPayment(providerRef: string): Promise<PaymentCheck>;
}
