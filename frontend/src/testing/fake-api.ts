import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AdminSession } from '../app/core/auth.service';
import {
  FREE_TEMPLATE_ID,
  InvitationTemplateId,
  StoreTemplate,
  TemplateOrder,
} from '../app/core/invitation-templates';
import { SEED_GUESTS } from '../app/core/wedding-seed-data';
import { DEMO_ACCOUNTS } from '../app/features/login/demo-accounts';

const CATALOGUE: Omit<StoreTemplate, 'owned'>[] = [
  {
    id: 'split',
    name: 'Split photo & paper',
    description: 'Your photo beside a cream panel with gold lettering.',
    priceCents: 0,
    listPriceCents: 0,
  },
  {
    id: 'overlay',
    name: 'Photo overlay',
    description: 'A full photo cover with gold names inside a gold frame.',
    priceCents: 1299,
    listPriceCents: 1499,
  },
  {
    id: 'floral',
    name: 'Classic floral cream',
    description: 'Cream watercolour paper, green leaves and an arched photo.',
    priceCents: 999,
    listPriceCents: 1199,
  },
  {
    id: 'royal',
    name: 'Royal night gold',
    description: 'Deep navy with an ornate gold border and a round photo.',
    priceCents: 2549,
    listPriceCents: 2999,
  },
];

/**
 * An in-memory stand-in for the backend API (`backend/`), for component tests. It follows the
 * same rules as the real endpoints with the sandbox payment provider; the backend's own tests
 * cover the server side. TestBed creates a fresh one for every test.
 */
@Injectable({ providedIn: 'root' })
export class FakeApi {
  session: AdminSession | null = null;
  readonly owned = new Set<InvitationTemplateId>([FREE_TEMPLATE_ID]);
  activeTemplateId: InvitationTemplateId = FREE_TEMPLATE_ID;
  readonly orders = new Map<number, TemplateOrder>();

  handle(request: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
    const route = `${request.method} ${request.url}`;
    const body = (request.body ?? {}) as Record<string, string>;
    let match: RegExpMatchArray | null;

    if (route === 'POST /api/auth/login') {
      return this.login(body['email'], body['password']);
    }
    if (route === 'POST /api/auth/logout') {
      this.session = null;
      return reply(null, 204);
    }
    if ((match = route.match(/^GET \/api\/public\/invitations\/(\w+)$/))) {
      return SEED_GUESTS.some((guest) => guest.invitationToken === match![1])
        ? reply({ templateId: this.activeTemplateId })
        : fail(404, 'Invitation not found.');
    }
    if (!this.session) {
      return fail(401, 'Please sign in.');
    }
    if (route === 'GET /api/auth/me') {
      return reply(this.session);
    }
    if (route === 'GET /api/templates') {
      return reply(this.catalogue());
    }
    if (route === 'POST /api/orders') {
      return this.createOrder(body['templateId'] as InvitationTemplateId);
    }
    if ((match = route.match(/^(GET|POST) \/api\/orders\/(\d+)(\/simulate-payment)?$/))) {
      const order = this.orders.get(Number(match[2]));
      if (!order) {
        return fail(404, 'Order not found.');
      }
      if (match[3] && order.status === 'pending') {
        this.owned.add(order.templateId);
        Object.assign(order, { status: 'paid', qrString: null, paidAt: new Date().toISOString() });
      }
      return reply(order);
    }
    if (route === 'PUT /api/weddings/current/template') {
      const id = body['templateId'] as InvitationTemplateId;
      if (!this.owned.has(id)) {
        return fail(403, 'Buy this template before using it.');
      }
      this.activeTemplateId = id;
      return reply(this.catalogue());
    }
    return fail(404, `FakeApi has no route for ${route}`);
  }

  private login(email = '', password = '') {
    const account = DEMO_ACCOUNTS.find(
      (entry) => entry.email === email.trim().toLowerCase() && entry.password === password,
    );
    if (!account) {
      return fail(401, 'That email and password do not match.');
    }
    this.session = {
      email: account.email,
      name: account.name,
      role: account.role,
      wedding: { id: 1, name: 'Simeng & Chanthy' },
    };
    return reply(this.session);
  }

  private catalogue() {
    return {
      templates: CATALOGUE.map((template) => ({ ...template, owned: this.owned.has(template.id) })),
      activeTemplateId: this.activeTemplateId,
    };
  }

  private createOrder(templateId: InvitationTemplateId) {
    const template = CATALOGUE.find((entry) => entry.id === templateId);
    if (!template) {
      return fail(404, 'That template is not available.');
    }
    if (this.owned.has(templateId)) {
      return fail(409, 'You already own this template.');
    }
    const id = this.orders.size + 1;
    const reference = `VW-${String(id).padStart(8, '0')}`;
    const order: TemplateOrder = {
      id,
      reference,
      templateId,
      amountCents: template.priceCents,
      currency: 'USD',
      status: 'pending',
      qrString: `VOWS-SANDBOX|${reference}|${template.priceCents}|USD`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      paidAt: null,
      testMode: true,
    };
    this.orders.set(id, order);
    return reply(order, 201);
  }
}

export const fakeApiInterceptor: HttpInterceptorFn = (request, next) =>
  request.url.startsWith('/api/') ? inject(FakeApi).handle(request) : next(request);

function reply(body: unknown, status = 200) {
  return of(new HttpResponse({ body: structuredClone(body), status }));
}

function fail(status: number, error: string) {
  return throwError(() => new HttpErrorResponse({ status, error: { error } }));
}
