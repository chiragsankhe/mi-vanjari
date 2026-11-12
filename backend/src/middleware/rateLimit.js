import rateLimit from 'express-rate-limit';
import { normalizePhone } from '../utils/format.js';

const handler = (_req, res) =>
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } });

/** Global safety net for the whole API. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Place search while typing: generous, but one visitor can't hammer the free geocoder. */
export const placesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** 5 login-code requests per email address / phone number per hour. */
export const otpPhoneLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.body?.email || '').trim().toLowerCase() || normalizePhone(req.body?.phone) || req.ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** 20 OTP requests per IP per hour (stops one device spraying many numbers). */
export const otpIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Brute-force protection for OTP verification. */
export const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Write-heavy endpoints (posting, messaging over REST, listings). */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

/** Admin login: 10 attempts per 15 minutes per IP. */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many admin login attempts. Wait 15 minutes and try again.' } }),
});

/** Admin email codes: 5 per email address per hour. */
export const adminEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.body?.email || '').trim().toLowerCase() || req.ip,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many codes requested for this email. Try again in an hour.' } }),
});
