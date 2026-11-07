import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';

const TONE_ICONS = {
  success: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 8h.01M11 12h1v5h1',
  danger: 'M12 7v6M12 17h.01',
};

@Component({
  selector: 'app-toast-outlet',
  host: { class: 'toast-outlet', role: 'status', 'aria-live': 'polite' },
  template: `
    @for (toast of toasts(); track toast.id) {
      <div [class]="'toast toast-' + toast.tone" animate.leave="toast-leave">
        <svg class="toast-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path [attr.d]="icons[toast.tone]" />
        </svg>
        <span>{{ toast.message }}</span>
        <button class="toast-close" type="button" aria-label="Dismiss" (click)="dismiss(toast.id)">
          ×
        </button>
      </div>
    }
  `,
})
export class ToastOutlet {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts;
  protected readonly icons = TONE_ICONS;

  protected dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
