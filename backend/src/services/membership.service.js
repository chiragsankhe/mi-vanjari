import { prisma } from '../lib/prisma.js';
import { getSettings, paidFromDate } from './settings.service.js';

/**
 * Matrimony membership rules
 *  • Before `matrimonyPaidFrom` (1 Dec 2026 by default) matrimony is free for everyone.
 *  • From then on a member needs an active membership (₹501 / 365 days) to browse matches,
 *    see matrimony details (family contacts, preferences, Kundali) and to be listed in search.
 *  • Admins and moderators always have access.
 */

export const activeMembershipWhere = (now = new Date()) => ({ revokedAt: null, startsAt: { lte: now }, expiresAt: { gt: now } });

/** Latest active (or upcoming) membership for a user. */
export async function currentMembership(userId) {
  const now = new Date();
  return prisma.membership.findFirst({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { expiresAt: 'desc' },
  });
}

/** Everything the app needs to know about a user's matrimony access. */
export async function membershipStatus(userId, role = 'USER') {
  const settings = await getSettings();
  const from = paidFromDate(settings);
  const required = Date.now() >= from.getTime();
  const m = userId ? await currentMembership(userId) : null;
  const active = Boolean(m && m.startsAt <= new Date());
  const staff = role === 'ADMIN' || role === 'MODERATOR';
  return {
    fee: settings.matrimonyFee,
    days: settings.membershipDays,
    paidFrom: settings.matrimonyPaidFrom,
    required,
    active,
    expiresAt: m?.expiresAt ?? null,
    startsAt: m?.startsAt ?? null,
    source: m?.source ?? null,
    hasAccess: staff || active || !required,
    staff,
  };
}

export async function hasMatrimonyAccess(user) {
  if (!user) return false;
  return (await membershipStatus(user.id, user.role)).hasAccess;
}

/** Prisma filter: profiles whose owner may appear in matrimony search right now. */
export async function listedOwnerFilter() {
  const settings = await getSettings();
  if (Date.now() < paidFromDate(settings).getTime()) return {};
  return { OR: [{ role: { in: ['ADMIN', 'MODERATOR'] } }, { memberships: { some: activeMembershipWhere() } }] };
}

/**
 * Add one membership period. Renewals stack: a new period starts when the current one ends,
 * so paying early never loses days.
 */
export async function grantMembership(tx, { userId, days, source, paymentId = null, grantedById = null, note = null, notBefore = null }) {
  const now = new Date();
  const latest = await tx.membership.findFirst({ where: { userId, revokedAt: null, expiresAt: { gt: now } }, orderBy: { expiresAt: 'desc' } });
  // paying before the paid period begins starts the year on that date, so no days are lost
  const startsAt = new Date(Math.max(now.getTime(), latest?.expiresAt.getTime() ?? 0, notBefore?.getTime() ?? 0));
  const expiresAt = new Date(startsAt.getTime() + days * 86400_000);
  return tx.membership.create({ data: { userId, startsAt, expiresAt, source, paymentId, grantedById, note } });
}
