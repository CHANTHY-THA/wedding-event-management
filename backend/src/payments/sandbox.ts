import type { Currency, PaymentCheck, PaymentProvider } from './provider.js';

/**
 * A pretend provider for development and testing: its QR codes cannot be paid with a bank app,
 * and an order counts as paid once a tester calls `simulatePayment`. Payments live in memory.
 */
export class SandboxProvider implements PaymentProvider {
  readonly name = 'sandbox';
  readonly testMode = true;
  private readonly payments = new Map<string, { amountCents: number; currency: Currency }>();

  async createPayment(request: { reference: string; amountCents: number; currency: Currency }) {
    return {
      providerRef: `sandbox-${request.reference}`,
      qrString: `VOWS-SANDBOX|${request.reference}|${request.amountCents}|${request.currency}`,
    };
  }

  async checkPayment(providerRef: string): Promise<PaymentCheck> {
    const payment = this.payments.get(providerRef);
    return payment ? { status: 'paid', ...payment, raw: { sandbox: true } } : { status: 'pending' };
  }

  /** Records a payment as if the buyer's bank had sent it. The amount can differ, to test checks. */
  simulatePayment(providerRef: string, amountCents: number, currency: Currency): void {
    this.payments.set(providerRef, { amountCents, currency });
  }
}
