import { CurrencyPipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { StoreTemplate, TemplateOrder } from '../../core/invitation-templates';
import { TemplateStoreService, apiErrorMessage } from '../../core/template-store.service';
import { ToastService } from '../../core/toast.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { QrCode } from '../../shared/qr-code/qr-code';

/** How often the dialog asks the server whether the bank has confirmed the payment. */
const POLL_MS = 3000;

/**
 * Pays for a template: the server creates an order with its own KHQR (amount built in), and
 * the dialog waits for the server to confirm the payment before unlocking the template.
 */
@Component({
  selector: 'app-template-checkout-dialog',
  imports: [CurrencyPipe, QrCode, TranslatePipe],
  templateUrl: './template-checkout-dialog.html',
  styleUrl: './template-checkout-dialog.scss',
})
export class TemplateCheckoutDialog implements OnInit {
  private readonly store = inject(TemplateStoreService);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly template = input.required<StoreTemplate>();
  readonly closed = output<void>();

  protected readonly order = signal<TemplateOrder | null>(null);
  protected readonly error = signal('');
  protected readonly isBusy = signal(false);
  private readonly now = signal(Date.now());
  /** "mm:ss" left before the QR expires. */
  protected readonly timeLeft = computed(() => {
    const order = this.order();
    const seconds = order
      ? Math.max(0, Math.floor((Date.parse(order.expiresAt) - this.now()) / 1000))
      : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    const poll = setInterval(() => {
      if (this.order()?.status === 'pending' && !this.isBusy()) {
        void this.checkPayment();
      }
    }, POLL_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(clock);
      clearInterval(poll);
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      void this.startOrder();
    }
  }

  /** Creates a new order, e.g. after the previous QR expired. */
  protected async startOrder(): Promise<void> {
    await this.run(
      () => this.store.createOrder(this.template().id),
      'Could not start the payment. Please try again.',
    );
  }

  protected async checkPayment(): Promise<void> {
    const order = this.order();
    if (order) {
      await this.run(
        () => this.store.getOrder(order.id),
        'Could not check the payment. Please try again.',
      );
    }
  }

  protected async simulatePayment(): Promise<void> {
    const order = this.order();
    if (order) {
      await this.run(() => this.store.simulatePayment(order.id), 'Could not simulate the payment.');
    }
  }

  private async run(request: () => Promise<TemplateOrder>, fallback: string): Promise<void> {
    this.isBusy.set(true);
    try {
      const order = await request();
      this.order.set(order);
      this.error.set('');
      if (order.status === 'paid') {
        await this.finish(order);
      }
    } catch (error) {
      this.error.set(apiErrorMessage(error, fallback));
    } finally {
      this.isBusy.set(false);
    }
  }

  /** Paid: refresh what the wedding owns, show the new design to guests, and close. */
  private async finish(order: TemplateOrder): Promise<void> {
    await this.store.load();
    await this.store.use(order.templateId);
    this.toast.show('Template unlocked and applied to your invitation');
    this.closed.emit();
  }
}
