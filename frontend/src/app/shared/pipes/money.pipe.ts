import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../../core/locale.service';
import { Currency } from '../../core/wedding.models';

/**
 * Formats money in the display currency chosen in the sidebar.
 *
 *   {{ 1200 | money }}                 USD amount, shown as $1,200 or 4,920,000 ៛
 *   {{ gift.amount | money: gift.currency : 'native' }}   shown in its own currency
 */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(
    amount: number,
    from: Currency = 'USD',
    to: Currency | 'native' = this.locale.currency(),
  ): string {
    const target = to === 'native' ? from : to;
    return this.locale.format(this.locale.convert(amount, from, target), target);
  }
}
