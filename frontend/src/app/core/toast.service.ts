import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'info' | 'danger';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const TOAST_DURATION_MS = 3200;
const MAX_TOASTS = 3;

/** Short confirmation messages ("Guest added") shown in the corner of the screen. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;

  readonly toasts = signal<Toast[]>([]);

  show(message: string, tone: ToastTone = 'success'): void {
    const toast: Toast = { id: this.nextId++, message, tone };
    this.toasts.update((toasts) => [...toasts, toast].slice(-MAX_TOASTS));
    setTimeout(() => this.dismiss(toast.id), TOAST_DURATION_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
