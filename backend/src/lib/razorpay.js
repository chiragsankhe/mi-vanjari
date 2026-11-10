import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/http.js';

/**
 * Minimal Razorpay client (REST, no SDK).
 * Security model:
 *   • The amount is always decided on the server and fixed in the Razorpay order.
 *   • After checkout, the browser's result is trusted only if its HMAC signature
 *     (order_id|payment_id, signed with our key secret) verifies — see verifyCheckoutSignature().
 *   • The payment is then fetched from Razorpay to confirm it is captured and the amount matches.
 *   • Webhooks (a backup if the browser closes) are verified with the webhook secret over the raw body.
 */
const API = 'https://api.razorpay.com/v1';

async function call(method, path, body) {
  if (!env.paymentsLive) throw ApiError.badRequest('Online payments are not configured yet');
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(502, 'PAYMENT_GATEWAY', data?.error?.description || 'Payment gateway error — please try again');
  return data;
}

/** Constant-time comparison of two hex strings. */
function safeEqualHex(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const createOrder = ({ amount, receipt, notes }) => call('POST', '/orders', { amount, currency: 'INR', receipt, notes, payment_capture: 1 });
export const fetchPayment = (paymentId) => call('GET', `/payments/${encodeURIComponent(paymentId)}`);
export const refundPayment = (paymentId, amount) => call('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { amount });

export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
