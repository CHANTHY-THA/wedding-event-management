import type { Config } from '../config.js';
import type { PaymentProvider } from './provider.js';
import { SandboxProvider } from './sandbox.js';

/** The provider chosen by PAYMENT_PROVIDER. Bakong KHQR or ABA PayWay is added here in step 3. */
export function createPaymentProvider(config: Config): PaymentProvider {
  switch (config.paymentProvider) {
    case 'sandbox':
      if (process.env['NODE_ENV'] === 'production') {
        throw new Error('The sandbox payment provider cannot run in production.');
      }
      return new SandboxProvider();
  }
}
