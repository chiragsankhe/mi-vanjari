import express, { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../lib/logger.js';
import { verifyWebhookSignature } from '../../lib/razorpay.js';
import { optionalAuth, requireAuth, requireProfile } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { membershipStatus } from '../../services/membership.service.js';
import { ApiError, h } from '../../utils/http.js';
import * as svc from './payments.service.js';

const router = Router();

/** GET /payments/plan — fee, start date, mode, and the caller's membership */
router.get(
  '/plan',
  optionalAuth,
  h(async (req, res) => {
    const membership = await membershipStatus(req.user?.id, req.user?.role);
    res.json({ ...membership, mode: svc.providerMode() });
  }),
);

/** POST /payments/order — start a ₹501 membership payment */
router.post('/order', requireAuth, requireProfile, writeLimiter, h(async (req, res) => res.json(await svc.createMembershipOrder(req.user))));

/** POST /payments/verify { orderId, paymentId, signature } — after Razorpay checkout */
router.post(
  '/verify',
  requireAuth,
  writeLimiter,
  validate({ body: z.object({ orderId: z.string().min(5).max(64), paymentId: z.string().min(5).max(64), signature: z.string().regex(/^[a-f0-9]{64}$/i) }) }),
  h(async (req, res) => res.json(await svc.verifyCheckout(req.user, req.body))),
);

/** POST /payments/test-complete { orderId } — development only (simulated checkout) */
router.post(
  '/test-complete',
  requireAuth,
  validate({ body: z.object({ orderId: z.string().startsWith('test_order_').max(64) }) }),
  h(async (req, res) => res.json(await svc.completeTestOrder(req.user, req.body.orderId))),
);

/** POST /payments/failed { orderId, reason } — checkout closed / failed (for the admin's view) */
router.post(
  '/failed',
  requireAuth,
  validate({ body: z.object({ orderId: z.string().max(64), reason: z.string().max(200).optional() }) }),
  h(async (req, res) => {
    await svc.markFailed(req.user, req.body.orderId, req.body.reason);
    res.json({ ok: true });
  }),
);

/** GET /payments/mine — receipts */
router.get('/mine', requireAuth, h(async (req, res) => res.json(await svc.myPayments(req.user.id))));

export default router;

/**
 * POST /payments/webhook — mounted in app.js *before* express.json(), because the signature
 * is computed over the exact raw bytes Razorpay sent.
 */
export const webhookRouter = Router();
webhookRouter.post(
  '/',
  express.raw({ type: 'application/json', limit: '256kb' }),
  h(async (req, res) => {
    const raw = req.body instanceof Buffer ? req.body : Buffer.from('');
    if (!verifyWebhookSignature(raw, req.get('x-razorpay-signature'))) throw ApiError.badRequest('Invalid signature');
    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      throw ApiError.badRequest('Invalid payload');
    }
    await svc.handleWebhook(event).catch((err) => logger.error({ err, event: event?.event }, 'Webhook handling failed'));
    res.json({ ok: true });
  }),
);
