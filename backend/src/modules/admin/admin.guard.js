import { audit } from '../../services/audit.service.js';
import { ApiError } from '../../utils/http.js';

const recent = new Map(); // throttle "access denied" logs: one per user+path per minute

/**
 * Front door of every /admin API route.
 *  • Not staff → 403 ADMIN_ONLY with a warning, and the attempt is written to the audit log.
 *  • Staff, but signed in through the normal member login → 403 ADMIN_LOGIN_REQUIRED
 *    (the admin panel needs the separate admin login: OTP + admin password).
 */
export async function adminGate(req, _res, next) {
  const staff = req.user.role === 'ADMIN' || req.user.role === 'MODERATOR';
  if (!staff) {
    const key = `${req.user.id}:${req.baseUrl}${req.path}`;
    if (!recent.has(key) || Date.now() - recent.get(key) > 60_000) {
      recent.set(key, Date.now());
      if (recent.size > 5000) recent.clear();
      await audit(req, 'ADMIN_ACCESS_DENIED', { details: { path: req.originalUrl, method: req.method } });
    }
    return next(ApiError.forbidden('⚠ Restricted area — admins only. This attempt has been recorded.', 'ADMIN_ONLY'));
  }
  if (!req.user.adminSession) return next(ApiError.forbidden('Please sign in through the admin login.', 'ADMIN_LOGIN_REQUIRED'));
  next();
}

const SECRET_KEYS = /password|otp|token|secret/i;
function summarize(body) {
  if (!body || typeof body !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(body).slice(0, 15)) {
    if (SECRET_KEYS.test(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 120) : Array.isArray(v) ? `[${v.length} items]` : v;
  }
  return out;
}

/** Records every successful admin change (POST/PUT/PATCH/DELETE) unless the handler wrote a richer entry itself. */
export function auditMutations(req, res, next) {
  if (req.method === 'GET') return next();
  res.on('finish', () => {
    if (res.statusCode >= 400 || res.locals.audited) return;
    const action = `ADMIN_${req.method}`;
    audit(req, action, { targetType: req.path.split('/')[1] || null, targetId: req.params?.id ?? req.path.split('/')[2] ?? null, details: { path: req.originalUrl, body: summarize(req.body) } });
  });
  next();
}
