import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/http.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function loadUser(token) {
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, phone: true, email: true, isBanned: true },
  });
  if (!user || user.isBanned) throw ApiError.unauthorized('Account not available');
  return { ...user, adminSession: payload.adm === 1 };
}

/** Requires a valid access token. Sets req.user = { id, role, phone }. */
export async function requireAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    req.user = await loadUser(token);
    // fire-and-forget presence tracking
    prisma.user.update({ where: { id: req.user.id }, data: { lastActiveAt: new Date() } }).catch(() => {});
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'TOKEN_EXPIRED', 'Session expired'));
  }
}

/** Attaches req.user when a valid token is present, otherwise continues anonymously. */
export async function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.user = await loadUser(token);
  } catch {
    /* anonymous */
  }
  next();
}

/**
 * Admin / moderator powers on member routes (edit or delete anyone's listing, auto-approve…).
 * Only for sessions opened through the admin login (email code + admin password) — an ADMIN-role
 * account signed in with a plain phone OTP gets no extra powers.
 */
export const isAdminSession = (user) => Boolean(user?.adminSession && user.role === 'ADMIN');
export const isStaffSession = (user) => Boolean(user?.adminSession && ['ADMIN', 'MODERATOR'].includes(user.role));

/** Role guard — use after requireAuth. */
export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    req.user && roles.includes(req.user.role) ? next() : next(ApiError.forbidden('Admins only'));

/** Ensures the user has completed profile setup. */
export async function requireProfile(req, _res, next) {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user.id }, select: { id: true } });
  if (!profile) return next(ApiError.forbidden('Please complete your profile first', 'PROFILE_REQUIRED'));
  next();
}
