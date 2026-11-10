import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { createOrder, fetchPayment, verifyCheckoutSignature } from '../../lib/razorpay.js';
import { grantMembership, membershipStatus } from '../../services/membership.service.js';
import { notify } from '../../services/notification.service.js';
import { getSettings, paidFromDate } from '../../services/settings.service.js';
import { ApiError } from '../../utils/http.js';

/** live = real Razorpay; test = development-only simulated checkout; off = production without keys */
export const providerMode = () => (env.paymentsLive ? 'live' : env.isProd ? 'off' : 'test');

const receiptNo = () => `MV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

/** Create (or reuse a fresh) order for the matrimony membership. The amount comes from settings only. */
export async function createMembershipOrder(user) {
  const mode = providerMode();
  if (mode === 'off') throw new ApiError(503, 'PAYMENTS_OFF', 'Online payments are being set up. Please try again soon.');
  const settings = await getSettings();
  const amount = settings.matrimonyFee * 100;

  // Re-use an unpaid order from the last 30 minutes (double clicks, page reloads)
  const recent = await prisma.payment.findFirst({
    where: { userId: user.id, status: 'CREATED', amount, provider: mode === 'live' ? 'RAZORPAY' : 'DEV_TEST', createdAt: { gt: new Date(Date.now() - 30 * 60_000) } },
    orderBy: { createdAt: 'desc' },
  });
  const profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { fullName: true } });
  let payment = recent;
  if (!payment) {
    const receipt = receiptNo();
    const orderId =
      mode === 'live'
        ? (await createOrder({ amount, receipt, notes: { userId: user.id, purpose: 'MATRIMONY_ANNUAL' } })).id
        : `test_order_${crypto.randomBytes(8).toString('hex')}`;
    payment = await prisma.payment.create({
      data: { userId: user.id, amount, provider: mode === 'live' ? 'RAZORPAY' : 'DEV_TEST', receipt, orderId, payerName: profile?.fullName, payerPhone: user.phone },
    });
  }
  return {
    mode,
    orderId: payment.orderId,
    receipt: payment.receipt,
    amount: payment.amount,
    currency: 'INR',
    keyId: mode === 'live' ? env.RAZORPAY_KEY_ID : null,
    description: `Matrimony membership · ${settings.membershipDays} days`,
    prefill: { name: profile?.fullName || '', contact: user.phone },
  };
}

/**
 * Mark a payment PAID and add a membership period — exactly once.
 * The conditional update (status CREATED/FAILED → PAID) makes this safe when the browser
 * callback and the webhook arrive at the same time.
 */
export async function markPaid(payment, { paymentId, method }) {
  const settings = await getSettings();
  const done = await prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ['CREATED', 'FAILED'] } },
      data: { status: 'PAID', paymentId, method, paidAt: new Date(), failureReason: null },
    });
    if (!count) return false; // already processed
    if (payment.userId) await grantMembership(tx, { userId: payment.userId, days: settings.membershipDays, source: 'PAYMENT', paymentId: payment.id, notBefore: paidFromDate(settings) });
    return true;
  });
  if (done && payment.userId) {
    notify({
      userId: payment.userId,
      type: 'SYSTEM',
      content: `Payment of ₹${payment.amount / 100} received — your matrimony membership is active. Receipt ${payment.receipt}`,
      link: '/settings?tab=membership',
    }).catch(() => {});
  }
  return done;
}

/** Browser callback after Razorpay checkout. */
export async function verifyCheckout(user, { orderId, paymentId, signature }) {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== user.id) throw ApiError.notFound('Order not found');
  if (payment.status === 'PAID') return { status: 'PAID', membership: await membershipStatus(user.id, user.role) };
  if (payment.provider !== 'RAZORPAY') throw ApiError.badRequest('Invalid order');

  if (!verifyCheckoutSignature({ orderId, paymentId, signature })) {
    logger.warn({ orderId, userId: user.id }, 'Payment signature mismatch');
    throw ApiError.badRequest('Payment could not be verified. If money was deducted it will be refunded automatically by your bank.');
  }
  // Double-check with Razorpay: right order, right amount, money captured.
  const rp = await fetchPayment(paymentId);
  if (rp.order_id !== orderId || rp.amount !== payment.amount || rp.currency !== 'INR') throw ApiError.badRequest('Payment details do not match this order');
  if (rp.status !== 'captured') return { status: 'PROCESSING', membership: await membershipStatus(user.id, user.role) };

  await markPaid(payment, { paymentId, method: rp.method });
  return { status: 'PAID', membership: await membershipStatus(user.id, user.role) };
}

/** Development only: complete a simulated order (never available in production or when Razorpay is live). */
export async function completeTestOrder(user, orderId) {
  if (env.isProd || env.paymentsLive) throw ApiError.notFound('Not available');
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.userId !== user.id || payment.provider !== 'DEV_TEST') throw ApiError.notFound('Order not found');
  await markPaid(payment, { paymentId: `test_pay_${crypto.randomBytes(8).toString('hex')}`, method: 'test' });
  return { status: 'PAID', membership: await membershipStatus(user.id, user.role) };
}

export async function markFailed(user, orderId, reason) {
  await prisma.payment.updateMany({ where: { orderId, userId: user.id, status: 'CREATED' }, data: { status: 'FAILED', failureReason: String(reason || 'Cancelled').slice(0, 200) } });
}

/** Razorpay webhook (already signature-verified). */
export async function handleWebhook(event) {
  const entity = event?.payload?.payment?.entity;
  if (event.event === 'payment.captured' && entity?.order_id) {
    const payment = await prisma.payment.findUnique({ where: { orderId: entity.order_id } });
    if (payment && entity.amount === payment.amount) await markPaid(payment, { paymentId: entity.id, method: entity.method });
  } else if (event.event === 'payment.failed' && entity?.order_id) {
    await prisma.payment.updateMany({
      where: { orderId: entity.order_id, status: 'CREATED' },
      data: { status: 'FAILED', failureReason: entity.error_description?.slice(0, 200) || 'Payment failed' },
    });
  } else if (event.event === 'refund.processed') {
    const refund = event?.payload?.refund?.entity;
    if (refund?.payment_id) await prisma.payment.updateMany({ where: { paymentId: refund.payment_id, status: 'PAID' }, data: { status: 'REFUNDED', refundId: refund.id, refundedAt: new Date() } });
  }
}

export const myPayments = (userId) =>
  prisma.payment.findMany({
    where: { userId, status: { not: 'CREATED' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, receipt: true, amount: true, status: true, method: true, provider: true, paidAt: true, createdAt: true, refundedAt: true, membership: { select: { startsAt: true, expiresAt: true } } },
  });
