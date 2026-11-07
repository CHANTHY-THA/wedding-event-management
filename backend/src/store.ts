import { randomBytes } from 'node:crypto';
import type { Db } from './db.js';
import { HttpError } from './http.js';
import type { Currency, PaymentCheck, PaymentProvider } from './payments/provider.js';

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'review';

interface OrderRow {
  id: number;
  reference: string;
  wedding_id: number;
  template_id: string;
  amount_cents: number;
  currency: Currency;
  status: OrderStatus;
  provider_ref: string | null;
  qr_string: string | null;
  expires_at: Date;
  paid_at: Date | null;
}

/** A payment that turns up this long after its QR expired still unlocks the template. */
const LATE_PAYMENT_HOURS = 24;

/** The catalogue as one wedding sees it: what it owns, and the design its guests see. */
export async function listTemplates(db: Db, weddingId: number) {
  const templates = await db.query<{
    id: string;
    name: string;
    description: string;
    priceCents: number;
    listPriceCents: number;
    owned: boolean;
  }>(
    `SELECT t.id, t.name, t.description, t.price_cents AS "priceCents",
            t.list_price_cents AS "listPriceCents",
            (t.price_cents = 0 OR e.template_id IS NOT NULL) AS owned
       FROM templates t
       LEFT JOIN entitlements e ON e.template_id = t.id AND e.wedding_id = $1
      WHERE t.on_sale OR e.template_id IS NOT NULL
      ORDER BY t.sort_order, t.id`,
    [weddingId],
  );
  const [wedding] = await db.query<{ active_template_id: string }>(
    'SELECT active_template_id FROM weddings WHERE id = $1',
    [weddingId],
  );
  return { templates, activeTemplateId: wedding.active_template_id };
}

/** Starts a purchase: reserves a reference, then asks the provider for a QR with the amount. */
export async function createOrder(
  db: Db,
  provider: PaymentProvider,
  ttlMinutes: number,
  buyer: { weddingId: number; userId: number },
  templateId: string,
): Promise<OrderRow> {
  const { templates } = await listTemplates(db, buyer.weddingId);
  const template = templates.find((entry) => entry.id === templateId);
  if (!template) {
    throw new HttpError(404, 'That template is not available.');
  }
  if (template.owned) {
    throw new HttpError(409, 'You already own this template.');
  }

  const order = await insertOrder(db, provider.name, ttlMinutes, buyer, template);
  try {
    const payment = await provider.createPayment({
      reference: order.reference,
      amountCents: order.amount_cents,
      currency: order.currency,
      expiresAt: order.expires_at,
    });
    const [updated] = await db.query<OrderRow>(
      'UPDATE orders SET provider_ref = $2, qr_string = $3 WHERE id = $1 RETURNING *',
      [order.id, payment.providerRef, payment.qrString],
    );
    await logEvent(db, order.id, 'created', { providerRef: payment.providerRef });
    return updated;
  } catch (error) {
    await db.query(`UPDATE orders SET status = 'failed' WHERE id = $1`, [order.id]);
    await logEvent(db, order.id, 'create-failed', { message: String(error) });
    throw new HttpError(502, 'The payment service is not available. Please try again.');
  }
}

export async function findOrder(db: Db, orderId: number, weddingId: number): Promise<OrderRow> {
  const [order] = await db.query<OrderRow>(
    'SELECT * FROM orders WHERE id = $1 AND wedding_id = $2',
    [orderId, weddingId],
  );
  if (!order) {
    throw new HttpError(404, 'Order not found.');
  }
  return order;
}

/**
 * Asks the provider about an unsettled order and records the answer: paid (template granted),
 * failed, or expired once its QR has run out. Settled orders are returned unchanged.
 */
export async function refreshOrder(db: Db, provider: PaymentProvider, order: OrderRow): Promise<OrderRow> {
  const lateLimit = order.expires_at.getTime() + LATE_PAYMENT_HOURS * 3_600_000;
  const checkable =
    order.provider_ref &&
    (order.status === 'pending' || (order.status === 'expired' && Date.now() < lateLimit));
  if (!checkable) {
    return order;
  }

  const check = await provider.checkPayment(order.provider_ref!);
  if (check.status === 'paid') {
    await settleOrder(db, order, check);
  } else if (check.status === 'failed') {
    await db.query(`UPDATE orders SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [order.id]);
    await logEvent(db, order.id, 'failed', check.raw ?? {});
  } else if (order.status === 'pending' && order.expires_at.getTime() <= Date.now()) {
    await db.query(`UPDATE orders SET status = 'expired' WHERE id = $1 AND status = 'pending'`, [order.id]);
  }
  return (await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [order.id]))[0];
}

/**
 * Grants the template if the payment matches the order exactly. Runs in one transaction, and
 * the status check in the UPDATE means a payment seen twice (polling and callback) grants once.
 */
async function settleOrder(db: Db, order: OrderRow, check: Extract<PaymentCheck, { status: 'paid' }>) {
  await db.transaction(async (tx) => {
    if (check.amountCents !== order.amount_cents || check.currency !== order.currency) {
      const [held] = await tx.query(
        `UPDATE orders SET status = 'review' WHERE id = $1 AND status IN ('pending', 'expired') RETURNING id`,
        [order.id],
      );
      if (held) {
        await logEvent(tx, order.id, 'amount-mismatch', {
          expected: { amountCents: order.amount_cents, currency: order.currency },
          received: { amountCents: check.amountCents, currency: check.currency },
          raw: check.raw ?? null,
        });
      }
      return;
    }
    const [paid] = await tx.query(
      `UPDATE orders SET status = 'paid', paid_at = now()
        WHERE id = $1 AND status IN ('pending', 'expired') RETURNING id`,
      [order.id],
    );
    if (!paid) {
      return;
    }
    await tx.query(
      `INSERT INTO entitlements (wedding_id, template_id, order_id) VALUES ($1, $2, $3)
       ON CONFLICT (wedding_id, template_id) DO NOTHING`,
      [order.wedding_id, order.template_id, order.id],
    );
    await logEvent(tx, order.id, 'paid', check.raw ?? {});
  });
}

/** Re-checks every order that could still be paid. Run on a timer by the server. */
export async function sweepOrders(db: Db, provider: PaymentProvider): Promise<void> {
  const orders = await db.query<OrderRow>(
    `SELECT * FROM orders
      WHERE status = 'pending'
         OR (status = 'expired' AND expires_at > now() - make_interval(hours => $1))`,
    [LATE_PAYMENT_HOURS],
  );
  for (const order of orders) {
    try {
      await refreshOrder(db, provider, order);
    } catch (error) {
      console.error(`Could not check order ${order.reference}:`, error);
    }
  }
}

/** Shows an owned template to the wedding's guests. */
export async function setActiveTemplate(db: Db, weddingId: number, templateId: string): Promise<void> {
  const { templates } = await listTemplates(db, weddingId);
  if (!templates.some((template) => template.id === templateId && template.owned)) {
    throw new HttpError(403, 'Buy this template before using it.');
  }
  await db.query('UPDATE weddings SET active_template_id = $2 WHERE id = $1', [weddingId, templateId]);
}

/** What a guest's invitation page needs from the server. Public, so it reveals nothing else. */
export async function findInvitation(db: Db, token: string) {
  const [invitation] = await db.query<{ templateId: string }>(
    `SELECT w.active_template_id AS "templateId"
       FROM guests g JOIN weddings w ON w.id = g.wedding_id
      WHERE g.invitation_token = $1`,
    [token],
  );
  if (!invitation) {
    throw new HttpError(404, 'Invitation not found.');
  }
  return invitation;
}

/** The order as the buyer's browser sees it. */
export function orderView(order: OrderRow, provider: PaymentProvider) {
  return {
    id: order.id,
    reference: order.reference,
    templateId: order.template_id,
    amountCents: order.amount_cents,
    currency: order.currency,
    status: order.status,
    // Only an open order can still be paid, so only it needs its QR.
    qrString: order.status === 'pending' ? order.qr_string : null,
    expiresAt: order.expires_at.toISOString(),
    paidAt: order.paid_at?.toISOString() ?? null,
    testMode: provider.testMode,
  };
}

async function insertOrder(
  db: Db,
  providerName: string,
  ttlMinutes: number,
  buyer: { weddingId: number; userId: number },
  template: { id: string; priceCents: number },
): Promise<OrderRow> {
  // References are random, so a clash is very unlikely; try again on the rare one.
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = `VW-${randomBytes(4).toString('hex').toUpperCase()}`;
    const [order] = await db.query<OrderRow>(
      `INSERT INTO orders (reference, wedding_id, template_id, created_by, amount_cents, currency,
                           provider, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'USD', $6, now() + make_interval(mins => $7))
       ON CONFLICT (reference) DO NOTHING
       RETURNING *`,
      [reference, buyer.weddingId, template.id, buyer.userId, template.priceCents, providerName, ttlMinutes],
    );
    if (order) {
      return order;
    }
  }
  throw new HttpError(500, 'Could not create the order. Please try again.');
}

async function logEvent(db: Db, orderId: number, kind: string, payload: unknown): Promise<void> {
  await db.query('INSERT INTO payment_events (order_id, kind, payload) VALUES ($1, $2, $3::jsonb)', [
    orderId,
    kind,
    JSON.stringify(payload),
  ]);
}
