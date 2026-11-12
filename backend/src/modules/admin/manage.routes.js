import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { refundPayment } from '../../lib/razorpay.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { audit } from '../../services/audit.service.js';
import { activeMembershipWhere, grantMembership } from '../../services/membership.service.js';
import { notify } from '../../services/notification.service.js';
import { addSampleContent, removeSampleContent, sampleStatus } from '../../services/sample-content.js';
import { getSettings, updateSettings } from '../../services/settings.service.js';
import { maskPhone } from '../../utils/format.js';
import { ApiError, h, pageResult, paginate } from '../../utils/http.js';
import { deleteAccount } from '../users/users.service.js';

/**
 * Admin management: users, payments, memberships, settings, audit log.
 * Mounted inside admin.routes.js, i.e. behind requireAuth + adminGate.
 */
const router = Router();
const admin = requireRole('ADMIN');
const mod = requireRole('ADMIN', 'MODERATOR');

const done = (res) => (res.locals.audited = true);

/** GET /admin/ping — lets the frontend check access (and logs non-admin attempts via adminGate) */
router.get('/ping', (req, res) => res.json({ ok: true, role: req.user.role }));

// ── Dashboard: money & members ────────────────────────────────────────────
router.get(
  '/revenue',
  mod,
  h(async (_req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const soon = new Date(Date.now() + 30 * 86400_000);
    const [total, month, refunded, paidCount, failedCount, activeMembers, expiringSoon, settings] = await Promise.all([
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'REFUNDED' }, _sum: { amount: true } }),
      prisma.payment.count({ where: { status: 'PAID' } }),
      prisma.payment.count({ where: { status: 'FAILED' } }),
      prisma.user.count({ where: { memberships: { some: activeMembershipWhere() } } }),
      prisma.membership.count({ where: { revokedAt: null, expiresAt: { gt: now, lte: soon } } }),
      getSettings(),
    ]);
    res.json({
      totalCollected: (total._sum.amount || 0) / 100,
      thisMonth: (month._sum.amount || 0) / 100,
      refunded: (refunded._sum.amount || 0) / 100,
      paidCount,
      failedCount,
      activeMembers,
      expiringSoon,
      settings,
      paymentsMode: env.paymentsLive ? 'live' : env.isProd ? 'off' : 'test',
    });
  }),
);

// ── Users ─────────────────────────────────────────────────────────────────
router.get(
  '/users',
  mod,
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 25 });
    const q = String(req.query.q || '').trim();
    const filter = String(req.query.filter || 'all');
    const where = {
      ...(q && { OR: [{ phone: { contains: q.replace(/\s/g, '') } }, { email: { contains: q.toLowerCase() } }, { profile: { fullName: { contains: q, mode: 'insensitive' } } }] }),
      ...(filter === 'banned' && { isBanned: true }),
      ...(filter === 'staff' && { role: { in: ['ADMIN', 'MODERATOR'] } }),
      ...(filter === 'members' && { memberships: { some: activeMembershipWhere() } }),
      ...(filter === 'matrimony' && { profile: { isMatrimonial: true } }),
      ...(filter === 'noprofile' && { profile: null }),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          phone: true,
          email: true,
          role: true,
          isBanned: true,
          createdAt: true,
          lastActiveAt: true,
          profile: { select: { fullName: true, isVerified: true, currentCity: true, isMatrimonial: true, profilePhotoUrl: true } },
          memberships: { where: activeMembershipWhere(), orderBy: { expiresAt: 'desc' }, take: 1, select: { expiresAt: true, source: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json(pageResult(items.map(({ memberships, ...u }) => ({ ...u, membership: memberships[0] || null })), total, { page, limit }));
  }),
);

router.get(
  '/users/:id',
  mod,
  h(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        phone: true,
        email: true,
        role: true,
        isBanned: true,
        intents: true,
        createdAt: true,
        lastActiveAt: true,
        adminPasswordHash: true,
        profile: { select: { fullName: true, gender: true, dateOfBirth: true, currentCity: true, currentState: true, occupation: true, isVerified: true, isMatrimonial: true, accountType: true, profilePhotoUrl: true } },
        memberships: { orderBy: { createdAt: 'desc' }, take: 20 },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { posts: true, sentMessages: true, sentFollows: true, receivedFollows: true, reportsFiled: true } },
      },
    });
    if (!user) throw ApiError.notFound('User not found');
    const { adminPasswordHash, ...rest } = user;
    res.json({ ...rest, hasAdminPassword: Boolean(adminPasswordHash) });
  }),
);

/** Guard against locking everyone out: never remove/demote/ban the last admin, never act on yourself. */
async function assertNotLastAdmin(target, req, action) {
  if (target.id === req.user.id && ['delete', 'ban', 'demote'].includes(action)) throw ApiError.badRequest(`You cannot ${action} your own account from the admin panel`);
  if (target.role === 'ADMIN') {
    const admins = await prisma.user.count({ where: { role: 'ADMIN', isBanned: false } });
    if (admins <= 1) throw ApiError.badRequest('This is the only admin — make someone else an admin first');
  }
}

router.put(
  '/users/:id',
  admin,
  validate({
    body: z.object({
      isBanned: z.boolean().optional(),
      role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
      isVerified: z.boolean().optional(),
      // admin-login email for staff ('' removes it)
      email: z.union([z.literal(''), z.string().trim().toLowerCase().email().max(120)]).optional(),
    }),
  }),
  h(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw ApiError.notFound('User not found');
    const { isVerified, ...userData } = req.body;
    if (userData.email !== undefined) {
      if (userData.email && !['ADMIN', 'MODERATOR'].includes(userData.role || target.role)) throw ApiError.badRequest('Only admins and moderators can have an admin-login email');
      if (!userData.email && !target.phone) throw ApiError.badRequest('This account signs in only by email — its email cannot be removed');
      userData.email = userData.email || null;
      if (userData.email && (await prisma.user.findFirst({ where: { email: userData.email, id: { not: target.id } } }))) throw ApiError.conflict('That email is already used by another account');
    }
    if (userData.isBanned) await assertNotLastAdmin(target, req, 'ban');
    if (userData.role && userData.role !== 'ADMIN' && target.role === 'ADMIN') await assertNotLastAdmin(target, req, 'demote');
    if (Object.keys(userData).length) await prisma.user.update({ where: { id: target.id }, data: userData });
    // banning or changing role ends all of their sessions
    if (userData.isBanned || (userData.role && userData.role !== target.role)) {
      await prisma.refreshToken.updateMany({ where: { userId: target.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    if (isVerified !== undefined) await prisma.profile.updateMany({ where: { userId: target.id }, data: { isVerified } });
    await audit(req, 'USER_UPDATED', { targetType: 'user', targetId: target.id, details: { phone: maskPhone(target.phone), ...req.body } });
    done(res);
    res.json({ ok: true });
  }),
);

/** DELETE /admin/users/:id — permanently delete an account (payments are kept for accounting, without the user link) */
router.delete(
  '/users/:id',
  admin,
  h(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, include: { profile: { select: { fullName: true } } } });
    if (!target) throw ApiError.notFound('User not found');
    await assertNotLastAdmin(target, req, 'delete');
    await deleteAccount(target.id);
    await audit(req, 'USER_DELETED', { targetType: 'user', targetId: target.id, details: { name: target.profile?.fullName || null, phone: maskPhone(target.phone), role: target.role } });
    done(res);
    res.json({ message: `${target.profile?.fullName || 'Account'} deleted` });
  }),
);

/** POST /admin/users/:id/membership { days, note } — grant free / cash-paid membership */
router.post(
  '/users/:id/membership',
  admin,
  validate({ body: z.object({ days: z.coerce.number().int().min(1).max(3650), note: z.string().trim().max(200).optional() }) }),
  h(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, phone: true } });
    if (!target) throw ApiError.notFound('User not found');
    const m = await prisma.$transaction((tx) => grantMembership(tx, { userId: target.id, days: req.body.days, source: 'ADMIN_GRANT', grantedById: req.user.id, note: req.body.note || null }));
    await audit(req, 'MEMBERSHIP_GRANTED', { targetType: 'user', targetId: target.id, details: { days: req.body.days, expiresAt: m.expiresAt, note: req.body.note } });
    notify({ userId: target.id, type: 'SYSTEM', content: `Your matrimony membership is active until ${m.expiresAt.toLocaleDateString('en-IN')}`, link: '/settings?tab=membership' }).catch(() => {});
    done(res);
    res.json(m);
  }),
);

/** DELETE /admin/users/:id/membership — revoke current membership */
router.delete(
  '/users/:id/membership',
  admin,
  h(async (req, res) => {
    const { count } = await prisma.membership.updateMany({ where: { userId: req.params.id, revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
    await audit(req, 'MEMBERSHIP_REVOKED', { targetType: 'user', targetId: req.params.id, details: { periods: count } });
    done(res);
    res.json({ revoked: count });
  }),
);

/** POST /admin/users/:id/reset-admin-password — they create a new one at next admin login */
router.post(
  '/users/:id/reset-admin-password',
  admin,
  h(async (req, res) => {
    await prisma.user.update({ where: { id: req.params.id }, data: { adminPasswordHash: null } });
    await prisma.refreshToken.updateMany({ where: { userId: req.params.id, isAdmin: true, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(req, 'ADMIN_PASSWORD_RESET', { targetType: 'user', targetId: req.params.id });
    done(res);
    res.json({ ok: true });
  }),
);

// ── Payments ──────────────────────────────────────────────────────────────
function paymentWhere(q) {
  const s = String(q.q || '').trim();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.from || '') ? new Date(`${q.from}T00:00:00+05:30`) : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.to || '') ? new Date(`${q.to}T23:59:59.999+05:30`) : null;
  return {
    ...(['CREATED', 'PAID', 'FAILED', 'REFUNDED'].includes(q.status) && { status: q.status }),
    ...(['RAZORPAY', 'DEV_TEST'].includes(q.provider) && { provider: q.provider }),
    ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    ...(s && {
      OR: [
        { receipt: { contains: s, mode: 'insensitive' } },
        { orderId: { contains: s } },
        { paymentId: { contains: s } },
        { payerName: { contains: s, mode: 'insensitive' } },
        { payerPhone: { contains: s.replace(/\s/g, '') } },
      ],
    }),
  };
}

router.get(
  '/payments',
  admin,
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 25 });
    const where = paymentWhere(req.query);
    const [items, total, paidSum, byStatus] = await Promise.all([
      prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { membership: { select: { startsAt: true, expiresAt: true, revokedAt: true } } } }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ['status'], where, _count: true }),
    ]);
    res.json({
      ...pageResult(items, total, { page, limit }),
      summary: { paidAmount: (paidSum._sum.amount || 0) / 100, byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])) },
    });
  }),
);

/** GET /admin/payments/export — CSV of the current filter (max 10 000 rows) */
router.get(
  '/payments/export',
  admin,
  h(async (req, res) => {
    const rows = await prisma.payment.findMany({ where: paymentWhere(req.query), orderBy: { createdAt: 'desc' }, take: 10_000, include: { membership: true } });
    const esc = (v) => {
      const s = v == null ? '' : String(v instanceof Date ? v.toISOString() : v);
      return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
    };
    const head = ['Receipt', 'Status', 'Amount (INR)', 'Name', 'Phone', 'Method', 'Provider', 'Order ID', 'Payment ID', 'Created', 'Paid at', 'Membership until', 'Refunded at'];
    const lines = rows.map((p) => [p.receipt, p.status, p.amount / 100, p.payerName, p.payerPhone, p.method, p.provider, p.orderId, p.paymentId, p.createdAt, p.paidAt, p.membership?.expiresAt, p.refundedAt].map(esc).join(','));
    await audit(req, 'PAYMENTS_EXPORTED', { details: { rows: rows.length, filter: req.query } });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="mi-vanjari-payments-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(`﻿${[head.join(','), ...lines].join('\n')}`);
  }),
);

/** POST /admin/payments/:id/refund { reason } — refunds through Razorpay and ends the membership period */
router.post(
  '/payments/:id/refund',
  admin,
  validate({ body: z.object({ reason: z.string().trim().min(3).max(200) }) }),
  h(async (req, res) => {
    const p = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { membership: true } });
    if (!p) throw ApiError.notFound('Payment not found');
    if (p.status !== 'PAID') throw ApiError.badRequest('Only paid payments can be refunded');
    let refundId = null;
    if (p.provider === 'RAZORPAY') {
      const r = await refundPayment(p.paymentId, p.amount);
      refundId = r.id;
    }
    await prisma.$transaction([
      prisma.payment.update({ where: { id: p.id }, data: { status: 'REFUNDED', refundId, refundedAt: new Date(), refundedById: req.user.id, failureReason: req.body.reason } }),
      ...(p.membership ? [prisma.membership.update({ where: { id: p.membership.id }, data: { revokedAt: new Date(), note: `Refunded: ${req.body.reason}` } })] : []),
    ]);
    await audit(req, 'PAYMENT_REFUNDED', { targetType: 'payment', targetId: p.id, details: { receipt: p.receipt, amount: p.amount / 100, reason: req.body.reason, refundId } });
    if (p.userId) notify({ userId: p.userId, type: 'SYSTEM', content: `Your payment ${p.receipt} of ₹${p.amount / 100} has been refunded.`, link: '/settings?tab=membership' }).catch(() => {});
    done(res);
    res.json({ ok: true, refundId });
  }),
);

// ── Settings ──────────────────────────────────────────────────────────────
router.get('/settings', admin, h(async (_req, res) => res.json(await getSettings())));

router.put(
  '/settings',
  admin,
  validate({
    body: z.object({
      matrimonyFee: z.coerce.number().int().min(1).max(100000).optional(),
      membershipDays: z.coerce.number().int().min(1).max(3650).optional(),
      matrimonyPaidFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
  }),
  h(async (req, res) => {
    const before = await getSettings();
    const after = await updateSettings(req.body, req.user.id);
    await audit(req, 'SETTINGS_UPDATED', { details: { before, after } });
    done(res);
    res.json(after);
  }),
);

// ── Sample content (so a new visitor sees how the site looks when it is busy) ──
router.get('/sample-content', admin, h(async (_req, res) => res.json(await sampleStatus())));
router.post(
  '/sample-content',
  admin,
  h(async (req, res) => {
    const result = await addSampleContent();
    await audit(req, 'SAMPLE_CONTENT_ADDED', { details: result.added });
    done(res);
    res.json(result);
  }),
);
router.delete(
  '/sample-content',
  admin,
  h(async (req, res) => {
    const result = await removeSampleContent();
    await audit(req, 'SAMPLE_CONTENT_REMOVED', { details: { removed: result.removed } });
    done(res);
    res.json(result);
  }),
);

// ── Audit & security log ──────────────────────────────────────────────────
router.get(
  '/audit',
  admin,
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 40 });
    const security = req.query.type === 'security';
    const where = {
      ...(security && { action: { in: ['ADMIN_ACCESS_DENIED', 'ADMIN_LOGIN_DENIED', 'ADMIN_LOGIN_FAILED', 'ADMIN_LOGIN', 'ADMIN_PASSWORD_CREATED', 'ADMIN_PASSWORD_RESET'] } }),
      ...(req.query.action && !security && { action: String(req.query.action) }),
    };
    const [items, total] = await Promise.all([prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }), prisma.auditLog.count({ where })]);
    // attach names for actors
    const ids = [...new Set(items.map((i) => i.actorId).filter(Boolean))];
    const names = Object.fromEntries((await prisma.profile.findMany({ where: { userId: { in: ids } }, select: { userId: true, fullName: true } })).map((p) => [p.userId, p.fullName]));
    res.json(pageResult(items.map((i) => ({ ...i, actorName: names[i.actorId] || null, actorPhone: i.actorPhone ? (i.actorPhone.includes('@') ? i.actorPhone.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : maskPhone(i.actorPhone)) : null })), total, { page, limit }));
  }),
);

export default router;
