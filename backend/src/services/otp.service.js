import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/http.js';

const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

/** Sends the OTP through MSG91's OTP API. */
async function sendViaMsg91(phone, code) {
  const mobile = phone.replace('+', '');
  const url = new URL('https://control.msg91.com/api/v5/otp');
  url.searchParams.set('template_id', env.MSG91_TEMPLATE_ID);
  url.searchParams.set('mobile', mobile);
  url.searchParams.set('otp', code);
  url.searchParams.set('otp_expiry', String(env.OTP_TTL_MINUTES));
  const res = await fetch(url, { method: 'POST', headers: { authkey: env.MSG91_AUTH_KEY, 'Content-Type': 'application/json' } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.type === 'error') {
    logger.error({ body }, 'MSG91 send failed');
    throw new ApiError(502, 'OTP_SEND_FAILED', 'Could not send OTP right now. Please try again.');
  }
}

/**
 * Generate, store (hashed) and deliver an OTP.
 * @returns {Promise<{ devOtp?: string }>} In development (no SMS provider) the code is returned for testing.
 */
export async function sendOtp(phone) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);
  // invalidate any previous unused codes for this phone
  await prisma.otpCode.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({
    data: { phone, codeHash, expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000) },
  });

  if (env.otpProvider === 'msg91') {
    await sendViaMsg91(phone, code);
    return {};
  }
  // never log or return a login code in production (the server also refuses to start there without SMS)
  if (env.isProd) throw new ApiError(503, 'SMS_NOT_CONFIGURED', 'Login by SMS is not available right now. Please try again later.');
  logger.warn(`📱 [DEV OTP] ${phone} → ${code}`);
  return { devOtp: code };
}

/** Verify an OTP; consumes it on success. Throws ApiError on failure. */
export async function verifyOtp(phone, code) {
  const record = await prisma.otpCode.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!record || record.expiresAt < new Date()) throw ApiError.badRequest('OTP expired. Please request a new one.');
  if (record.attempts >= MAX_ATTEMPTS) throw ApiError.badRequest('Too many wrong attempts. Please request a new OTP.');

  const ok = await bcrypt.compare(code, record.codeHash);
  if (!ok) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Incorrect OTP. Please check and try again.');
  }
  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
}

/**
 * Admin login code by email. Same storage and rules as SMS codes (hashed, 5 attempts, expiry);
 * the email address is used as the identifier.
 * Without SMTP configured, development returns the code for testing; production refuses.
 */
export async function sendEmailOtp(email, meta = {}) {
  const { adminCodeEmail, sendMail } = await import('../lib/mailer.js');
  if (!env.mailConfigured && env.isProd) throw new ApiError(503, 'MAIL_NOT_CONFIGURED', 'Admin email is not set up yet.');
  const code = generateCode();
  await prisma.otpCode.updateMany({ where: { phone: email, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({ data: { phone: email, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  if (env.mailConfigured) {
    await sendMail({ to: email, ...adminCodeEmail({ code, ip: meta.ip || 'unknown', minutes: 10 }) });
    return { sentTo: email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') };
  }
  logger.warn(`✉️  [DEV ADMIN CODE] ${email} → ${code}  (set SMTP_PASS in backend/.env to send real emails)`);
  return { devOtp: code, sentTo: email };
}

/** OtpCode identifier for member email login (kept apart from admin codes, which use the bare email). */
export const loginKey = (email) => `login:${email}`;

/**
 * Member login code by email (the free alternative to SMS). Hashed, expires, 5 attempts — same rules as SMS.
 * Without email configured, development returns the code for testing; production refuses.
 */
export async function sendLoginEmailOtp(email) {
  const { loginCodeEmail, sendMail } = await import('../lib/mailer.js');
  if (!env.mailConfigured && env.isProd) throw new ApiError(503, 'MAIL_NOT_CONFIGURED', 'Login by email is not available right now. Please try again later.');
  const code = generateCode();
  const key = loginKey(email);
  await prisma.otpCode.updateMany({ where: { phone: key, consumedAt: null }, data: { consumedAt: new Date() } });
  const minutes = Math.max(10, env.OTP_TTL_MINUTES); // emails can take a minute to arrive
  await prisma.otpCode.create({ data: { phone: key, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + minutes * 60_000) } });
  if (env.mailConfigured) {
    await sendMail({ to: email, ...loginCodeEmail({ code, minutes }) });
    return {};
  }
  logger.warn(`✉️  [DEV LOGIN CODE] ${email} → ${code}  (set BREVO_API_KEY or SMTP_PASS to send real emails)`);
  return { devOtp: code };
}
