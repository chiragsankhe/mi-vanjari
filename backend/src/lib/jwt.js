import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Short-lived access token carried in the Authorization header.
 * `adm: 1` marks a session opened through the admin login (OTP + admin password) — only those reach /admin.
 */
export function signAccessToken(user, adminSession = false) {
  return jwt.sign({ sub: user.id, role: user.role, ...(adminSession && { adm: 1 }) }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
    issuer: 'mivanjari',
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'mivanjari' });
}

/** Opaque refresh token (random bytes) — only its SHA-256 hash is stored in the DB. */
export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
}
