import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';
import { loginKey, sendEmailOtp, sendLoginEmailOtp, sendOtp, verifyOtp } from '../../services/otp.service.js';
import { ApiError } from '../../utils/http.js';
import { sessionUser } from '../users/users.service.js';

export async function requestOtp(phone) {
  const existing = await prisma.user.findUnique({ where: { phone }, select: { isBanned: true } });
  if (existing?.isBanned) throw ApiError.forbidden('This account has been suspended. Contact support.');
  return sendOtp(phone);
}

// ── Member login by email code (free; the default) ─────────────────────────

export async function requestEmailOtp(rawEmail) {
  const email = normalizeEmail(rawEmail);
  const existing = await prisma.user.findUnique({ where: { email }, select: { isBanned: true } });
  if (existing?.isBanned) throw ApiError.forbidden('This account has been suspended. Contact support.');
  return sendLoginEmailOtp(email);
}

/**
 * Verify the email code and sign in. Finds the account by login email; an older phone account whose
 * profile has this email is linked instead of creating a duplicate. Otherwise a new account is created.
 */
export async function verifyEmailAndLogin(rawEmail, otp, meta) {
  const email = normalizeEmail(rawEmail);
  await verifyOtp(loginKey(email), otp);
  return finishEmailLogin(email, meta);
}

/** Sign in the account that owns this (verified) email, linking an older phone account or creating a new one. */
async function finishEmailLogin(email, meta) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const linked = await prisma.profile.findFirst({ where: { email, user: { email: null } }, select: { userId: true } });
    if (linked) user = await prisma.user.update({ where: { id: linked.userId }, data: { email } });
  }
  if (!user) user = await prisma.user.create({ data: { email, role: 'USER' } });
  if (user.isBanned) throw ApiError.forbidden('This account has been suspended.');
  user = await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  const tokens = await issueTokens(user, meta);
  const session = await sessionUser(user.id);
  return { ...tokens, user: session, isNewUser: !session.profile };
}

/**
 * Google sign-in. The browser gets a signed ID token from Google; we ask Google to validate it, check it was
 * issued for OUR client id and that the email is verified, then sign in (or create) the account with that email.
 */
export async function googleLogin(credential, meta) {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not available right now.');
  let info;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    info = await res.json();
    if (!res.ok) info = null;
  } catch {
    throw new ApiError(502, 'GOOGLE_UNREACHABLE', 'Could not reach Google. Please try again.');
  }
  const issuerOk = info && ['accounts.google.com', 'https://accounts.google.com'].includes(info.iss);
  if (!info || !issuerOk || info.aud !== env.GOOGLE_CLIENT_ID || String(info.email_verified) !== 'true' || !info.email) {
    throw ApiError.unauthorized('Google sign-in failed. Please try again.');
  }
  const email = normalizeEmail(info.email);
  const existing = await prisma.user.findUnique({ where: { email }, select: { isBanned: true } });
  if (existing?.isBanned) throw ApiError.forbidden('This account has been suspended.');
  const result = await finishEmailLogin(email, meta);
  return { ...result, googleName: info.name || null };
}

async function issueTokens(user, meta, family = crypto.randomUUID(), adminSession = false) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      family,
      userAgent: meta.userAgent?.slice(0, 250),
      ip: meta.ip,
      isAdmin: adminSession,
      // admin sessions are short (sliding window, renewed while in use)
      expiresAt: new Date(Date.now() + (adminSession ? env.ADMIN_SESSION_HOURS * 3600_000 : env.REFRESH_TOKEN_DAYS * 86400_000)),
    },
  });
  return { accessToken: signAccessToken(user, adminSession), refreshToken, adminSession };
}

export async function verifyAndLogin(phone, otp, meta) {
  await verifyOtp(phone, otp);

  let user = await prisma.user.findUnique({ where: { phone } });
  const isAdminPhone = env.adminPhones.includes(phone);
  if (!user) {
    user = await prisma.user.create({ data: { phone, isPhoneVerified: true, role: isAdminPhone ? 'ADMIN' : 'USER' } });
  } else {
    if (user.isBanned) throw ApiError.forbidden('This account has been suspended.');
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true, lastActiveAt: new Date(), ...(isAdminPhone && { role: 'ADMIN' }) },
    });
  }

  const tokens = await issueTokens(user, meta);
  const session = await sessionUser(user.id);
  return { ...tokens, user: session, isNewUser: !session.profile };
}

/** Refresh-token rotation with reuse detection. */
export async function rotateRefreshToken(token, meta) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!record) throw ApiError.unauthorized('Session expired');

  // Grace window: two tabs refreshing at the same moment both present the same token.
  // Only tokens that were *rotated* (not logged out) get the grace window.
  const inGrace = record.rotatedAt && Date.now() - record.rotatedAt.getTime() < 20_000;
  if (record.revokedAt && !inGrace) {
    // A revoked token was presented again → likely stolen. Kill the whole family.
    await prisma.refreshToken.updateMany({ where: { family: record.family, revokedAt: null }, data: { revokedAt: new Date() } });
    throw ApiError.unauthorized('Session expired');
  }
  if (record.expiresAt < new Date() || record.user.isBanned) throw ApiError.unauthorized('Session expired');

  if (!record.revokedAt) await prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date(), rotatedAt: new Date() } });
  // an admin session whose user is no longer staff silently becomes a normal session
  const stillStaff = ['ADMIN', 'MODERATOR'].includes(record.user.role);
  const tokens = await issueTokens(record.user, meta, record.family, record.isAdmin && stillStaff);
  return { ...tokens, user: { ...(await sessionUser(record.userId)), adminSession: tokens.adminSession } };
}

export async function revokeToken(token) {
  if (!token) return;
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record) return;
  // Revoke the whole rotation family for this device session and close any grace window.
  await prisma.refreshToken.updateMany({ where: { family: record.family }, data: { revokedAt: new Date(), rotatedAt: null } });
}

export async function revokeAll(userId) {
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revokedAt: new Date(), rotatedAt: null } });
}

// ── Admin login: code to the admin's EMAIL + admin password ──────────────────

const isStaffRole = (role) => role === 'ADMIN' || role === 'MODERATOR';
export const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

/**
 * Staff account for an email: a user whose email field is set, or an address in ADMIN_EMAILS
 * (the first time, an email-only admin account is created for it).
 */
async function staffForEmail(email, { create = false } = {}) {
  let user = await prisma.user.findUnique({ where: { email } });
  const listed = env.adminEmails.includes(email);
  if (!user && listed && create) user = await prisma.user.create({ data: { email, role: 'ADMIN' } });
  else if (user && listed && user.role !== 'ADMIN') user = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  const allowed = (user && isStaffRole(user.role)) || (!user && listed);
  return { user, allowed };
}

/** Step 1 — only admin emails get a code. Others are refused (and the route logs the attempt). */
export async function adminRequestOtp(rawEmail, meta) {
  const email = normalizeEmail(rawEmail);
  const { user, allowed } = await staffForEmail(email);
  if (!allowed) throw ApiError.forbidden('This email does not have admin access. This attempt has been recorded.', 'NOT_ADMIN');
  if (user?.isBanned) throw ApiError.forbidden('This account has been suspended.');
  const result = await sendEmailOtp(email, meta);
  return { ...result, hasPassword: Boolean(user?.adminPasswordHash) };
}

/** A strong admin password: 10+ characters with letters and numbers. */
export function checkAdminPassword(pw) {
  return typeof pw === 'string' && pw.length >= 10 && pw.length <= 128 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

/**
 * Step 2 — verify the email code, then the admin password (or create it on the very first admin login).
 * The code is consumed even when the password is wrong, so every guess needs a fresh email.
 */
export async function adminLogin({ email: rawEmail, otp, password, newPassword }, meta) {
  const email = normalizeEmail(rawEmail);
  await verifyOtp(email, otp);
  let { user, allowed } = await staffForEmail(email, { create: true });
  if (!allowed || !user) throw ApiError.forbidden('This email does not have admin access. This attempt has been recorded.', 'NOT_ADMIN');
  if (user.isBanned) throw ApiError.forbidden('This account has been suspended.');

  let firstSetup = false;
  if (user.adminPasswordHash) {
    const ok = typeof password === 'string' && (await bcrypt.compare(password, user.adminPasswordHash));
    if (!ok) throw new ApiError(401, 'WRONG_ADMIN_PASSWORD', 'Wrong admin password. Request a new code and try again.');
  } else {
    if (!checkAdminPassword(newPassword)) {
      throw new ApiError(400, 'ADMIN_PASSWORD_SETUP', 'Create an admin password: at least 10 characters with letters and numbers.');
    }
    await prisma.user.update({ where: { id: user.id }, data: { adminPasswordHash: await bcrypt.hash(newPassword, 12) } });
    firstSetup = true;
  }

  user = await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  const tokens = await issueTokens(user, meta, crypto.randomUUID(), true);
  return { ...tokens, user: { ...(await sessionUser(user.id)), adminSession: true }, firstSetup, userId: user.id, email };
}
