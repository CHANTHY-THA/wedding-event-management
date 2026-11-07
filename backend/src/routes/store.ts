import { Router } from 'express';
import type { Config } from '../config.js';
import type { Db } from '../db.js';
import { currentUser, HttpError, requireUser } from '../http.js';
import type { PaymentProvider } from '../payments/provider.js';
import { SandboxProvider } from '../payments/sandbox.js';
import {
  createOrder,
  findInvitation,
  findOrder,
  listTemplates,
  orderView,
  refreshOrder,
  setActiveTemplate,
} from '../store.js';

/** Template catalogue, purchases and the wedding's chosen design. */
export function storeRoutes(db: Db, config: Config, provider: PaymentProvider): Router {
  const router = Router();
  // Only the couple and their planner manage the invitation and pay for it.
  const manager = requireUser('couple', 'planner');

  router.get('/templates', manager, async (_req, res) => {
    res.json(await listTemplates(db, currentUser(res)!.weddingId));
  });

  router.post('/orders', manager, async (req, res) => {
    const user = currentUser(res)!;
    const order = await createOrder(
      db,
      provider,
      config.orderTtlMinutes,
      { weddingId: user.weddingId, userId: user.userId },
      String(req.body?.templateId ?? ''),
    );
    res.status(201).json(orderView(order, provider));
  });

  router.get('/orders/:id', manager, async (req, res) => {
    const order = await findOrder(db, orderId(req.params['id']), currentUser(res)!.weddingId);
    res.json(orderView(await refreshOrder(db, provider, order), provider));
  });

  // Test mode only: behave as if the buyer's bank had paid the order in full.
  router.post('/orders/:id/simulate-payment', manager, async (req, res) => {
    if (!(provider instanceof SandboxProvider)) {
      throw new HttpError(404, 'Not found.');
    }
    const order = await findOrder(db, orderId(req.params['id']), currentUser(res)!.weddingId);
    provider.simulatePayment(order.provider_ref ?? '', order.amount_cents, order.currency);
    res.json(orderView(await refreshOrder(db, provider, order), provider));
  });

  router.put('/weddings/current/template', manager, async (req, res) => {
    const { weddingId } = currentUser(res)!;
    await setActiveTemplate(db, weddingId, String(req.body?.templateId ?? ''));
    res.json(await listTemplates(db, weddingId));
  });

  // Public: a guest's invitation page asks which design to show.
  router.get('/public/invitations/:token', async (req, res) => {
    res.json(await findInvitation(db, String(req.params['token'])));
  });

  return router;
}

function orderId(value: unknown): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(404, 'Order not found.');
  }
  return id;
}
