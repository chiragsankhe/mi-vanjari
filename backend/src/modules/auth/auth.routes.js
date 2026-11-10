import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { adminEmailLimiter, adminLoginLimiter, otpIpLimiter, otpPhoneLimiter, verifyLimiter } from '../../middleware/rateLimit.js';
import { adminLoginAlertEmail, sendMail } from '../../lib/mailer.js';
import { audit } from '../../services/audit.service.js';
import { validate } from '../../middleware/validate.js';
import { normalizePhone } from '../../utils/format.js';
import { ApiError, h } from '../../utils/http.js';
import * as auth from './auth.service.js';

const router = Router();

const REFRESH_COOKIE = 'mv_rt';
const cookieOptions = (adminSession = false) => ({
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
  maxAge: adminSession ? env.ADMIN_SESSION_HOURS * 3600 * 1000 : env.REFRESH_TOKEN_DAYS * 24 * 3600 * 1000,
});

const phoneSchema = z.object({
  phone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit Indian mobile number' });
    return p;
  }),
});

/**
 * Members log in with a 6-digit code sent to their EMAIL (free). Phone + SMS still works when an SMS
 * provider (MSG91) is configured, or in development.
 */
const loginEmail = z.string().trim().toLowerCase().email('Enter a valid email address').max(120);
const loginSchema = z.union([z.object({ email: loginEmail }), phoneSchema], {
  errorMap: () => ({ message: 'Enter a valid email address' }),
});
const otpField = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');

/** POST /auth/send-otp { email } (or { phone }) */
router.post(
  '/send-otp',
  otpIpLimiter,
  otpPhoneLimiter,
  validate({ body: loginSchema }),
  h(async (req, res) => {
    const result = req.body.email ? await auth.requestEmailOtp(req.body.email) : await auth.requestOtp(req.body.phone);
    res.json({ message: 'Code sent', ...result });
  }),
);

/** POST /auth/verify-otp { email | phone, otp } → { accessToken, user, isNewUser } + refresh cookie */
router.post(
  '/verify-otp',
  verifyLimiter,
  validate({ body: z.union([z.object({ email: loginEmail, otp: otpField }), phoneSchema.extend({ otp: otpField })], { errorMap: () => ({ message: 'Enter the 6-digit code' }) }) }),
  h(async (req, res) => {
    const meta = { userAgent: req.get('user-agent'), ip: req.ip };
    const { user, isNewUser, accessToken, refreshToken } = req.body.email
      ? await auth.verifyEmailAndLogin(req.body.email, req.body.otp, meta)
      : await auth.verifyAndLogin(req.body.phone, req.body.otp, meta);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
    res.json({ accessToken, user, isNewUser });
  }),
);

/** POST /auth/refresh — rotates the refresh cookie (body.refreshToken accepted for native clients). */
router.post(
  '/refresh',
  h(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    if (!token) throw ApiError.unauthorized('No session');
    try {
      const { user, accessToken, refreshToken, adminSession } = await auth.rotateRefreshToken(token, { userAgent: req.get('user-agent'), ip: req.ip });
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(adminSession));
      res.json({ accessToken, user });
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
      throw err;
    }
  }),
);

// ── Admin login (separate page: /admin/login) ────────────────────────────────

/** POST /auth/admin/send-otp { phone } — only admin numbers receive a code */
const emailSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address').max(120) });
const maskEmail = (e) => String(e || '').replace(/^(.{2}).*(@.*)$/, '$1•••$2');

/** POST /auth/admin/send-otp { email } — only admin emails receive a code */
router.post(
  '/admin/send-otp',
  adminLoginLimiter,
  adminEmailLimiter,
  validate({ body: emailSchema }),
  h(async (req, res) => {
    try {
      res.json({ message: 'Code sent', ...(await auth.adminRequestOtp(req.body.email, { ip: req.ip })) });
    } catch (err) {
      if (err.code === 'NOT_ADMIN') await audit(req, 'ADMIN_LOGIN_DENIED', { details: { email: maskEmail(req.body.email), step: 'code' }, actor: null });
      throw err;
    }
  }),
);

/** POST /auth/admin/login { email, otp, password? | newPassword? } → admin session */
router.post(
  '/admin/login',
  adminLoginLimiter,
  verifyLimiter,
  validate({
    body: emailSchema.extend({
      otp: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
      password: z.string().max(128).optional(),
      newPassword: z.string().max(128).optional(),
    }),
  }),
  h(async (req, res) => {
    try {
      const { user, accessToken, refreshToken, firstSetup, userId, email } = await auth.adminLogin(req.body, { userAgent: req.get('user-agent'), ip: req.ip });
      await audit(req, firstSetup ? 'ADMIN_PASSWORD_CREATED' : 'ADMIN_LOGIN', { actor: { id: userId, phone: email } });
      // security alert to the admin's inbox (never blocks the login)
      if (env.mailConfigured) sendMail({ to: email, ...adminLoginAlertEmail({ ip: req.ip, userAgent: req.get('user-agent') }) }).catch(() => {});
      res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(true));
      res.json({ accessToken, user });
    } catch (err) {
      if (['NOT_ADMIN', 'WRONG_ADMIN_PASSWORD'].includes(err.code)) {
        await audit(req, 'ADMIN_LOGIN_FAILED', { details: { email: maskEmail(req.body.email), reason: err.code }, actor: null });
      }
      throw err;
    }
  }),
);

/** POST /auth/logout */
router.post(
  '/logout',
  h(async (req, res) => {
    await auth.revokeToken(req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.json({ message: 'Logged out' });
  }),
);

/** POST /auth/logout-all — sign out of every device */
router.post(
  '/logout-all',
  requireAuth,
  h(async (req, res) => {
    await auth.revokeAll(req.user.id);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.json({ message: 'Logged out from all devices' });
  }),
);

export default router;
