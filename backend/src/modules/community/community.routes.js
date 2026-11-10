import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { saveImage } from '../../lib/storage.js';
import { isStaffSession, optionalAuth, requireAuth, requireProfile } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { notify } from '../../services/notification.service.js';
import { getBlockedIds } from '../../services/privacy.service.js';
import { ApiError, h, pageResult, paginate } from '../../utils/http.js';
import { toCards } from '../matrimonial/matrimonial.service.js';

/**
 * Community: community updates (posts), member directory, public stats, reports.
 */
const router = Router();

// ── Public stats (landing page) ────────────────────────────────────────────

let statsCache = { at: 0, data: null };
/** GET /community/stats — cached for 5 minutes */
router.get(
  '/stats',
  h(async (_req, res) => {
    if (Date.now() - statsCache.at < 5 * 60_000 && statsCache.data) return res.json(statsCache.data);
    const monthAgo = new Date(Date.now() - 30 * 86400_000);
    const [members, connections, businesses, services, joinedThisMonth] = await Promise.all([
      prisma.profile.count({ where: { isActive: true } }),
      prisma.follow.count({ where: { status: 'ACCEPTED' } }),
      prisma.business.count({ where: { isActive: true, status: 'APPROVED' } }),
      prisma.serviceProvider.count({ where: { isActive: true, status: 'APPROVED' } }),
      prisma.profile.count({ where: { createdAt: { gte: monthAgo } } }),
    ]);
    statsCache = { at: Date.now(), data: { members, connections, businesses, services, joinedThisMonth } };
    res.json(statsCache.data);
  }),
);

// ── Member directory ───────────────────────────────────────────────────────

/** GET /community/members?q&city&page — search community members (non-matrimonial too) */
router.get(
  '/members',
  requireAuth,
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 20 });
    const blocked = await getBlockedIds(req.user.id);
    const q = String(req.query.q || '').trim();
    const where = {
      isActive: true,
      userId: { notIn: [req.user.id, ...blocked] },
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { currentCity: { contains: q, mode: 'insensitive' } },
          { occupation: { contains: q, mode: 'insensitive' } },
          { nativeVillage: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([prisma.profile.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }), prisma.profile.count({ where })]);
    res.json(pageResult(await toCards(req.user.id, rows), total, { page, limit }));
  }),
);

// ── Posts / community updates ──────────────────────────────────────────────

const authorSelect = { profile: { select: { userId: true, fullName: true, profilePhotoUrl: true, isVerified: true, currentCity: true } } };

async function shapePosts(rows, viewerId) {
  const liked = viewerId
    ? new Set((await prisma.postLike.findMany({ where: { userId: viewerId, postId: { in: rows.map((r) => r.id) } }, select: { postId: true } })).map((l) => l.postId))
    : new Set();
  return rows.map((p) => ({
    id: p.id,
    content: p.content,
    imageUrl: p.imageUrl,
    likeCount: p.likeCount,
    createdAt: p.createdAt,
    liked: liked.has(p.id),
    isMine: p.authorId === viewerId,
    author: p.author.profile,
  }));
}

/** GET /community/posts?authorId&page — community feed */
router.get(
  '/posts',
  optionalAuth,
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 10 });
    const blocked = await getBlockedIds(req.user?.id);
    const where = {
      isHidden: false,
      author: { isBanned: false, profile: { isNot: null } },
      ...(req.query.authorId ? { authorId: String(req.query.authorId) } : blocked.length && { authorId: { notIn: blocked } }),
    };
    const [rows, total] = await Promise.all([
      prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { author: { select: authorSelect } } }),
      prisma.post.count({ where }),
    ]);
    res.json(pageResult(await shapePosts(rows, req.user?.id), total, { page, limit }));
  }),
);

/** POST /community/posts — multipart: content + optional image */
router.post(
  '/posts',
  requireAuth,
  requireProfile,
  writeLimiter,
  upload.single('image'),
  validate({ body: z.object({ content: z.string().trim().min(1, 'Write something to share').max(2000) }) }),
  h(async (req, res) => {
    const imageUrl = req.file ? (await saveImage(req.file, 'posts')).url : null;
    const post = await prisma.post.create({ data: { authorId: req.user.id, content: req.body.content, imageUrl }, include: { author: { select: authorSelect } } });
    res.status(201).json((await shapePosts([post], req.user.id))[0]);
  }),
);

/** POST /community/posts/:id/like — toggle like */
router.post(
  '/posts/:id/like',
  requireAuth,
  h(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.isHidden) throw ApiError.notFound('Post not found');
    const key = { postId_userId: { postId: post.id, userId: req.user.id } };
    const existing = await prisma.postLike.findUnique({ where: key });
    if (existing) {
      await prisma.$transaction([prisma.postLike.delete({ where: key }), prisma.post.update({ where: { id: post.id }, data: { likeCount: { decrement: 1 } } })]);
      return res.json({ liked: false, likeCount: post.likeCount - 1 });
    }
    await prisma.$transaction([prisma.postLike.create({ data: { postId: post.id, userId: req.user.id } }), prisma.post.update({ where: { id: post.id }, data: { likeCount: { increment: 1 } } })]);
    const me = await prisma.profile.findUnique({ where: { userId: req.user.id }, select: { fullName: true } });
    notify({ userId: post.authorId, type: 'POST_LIKED', content: `${me?.fullName || 'A member'} liked your post`, fromUserId: req.user.id, link: '/community?tab=updates' }).catch(() => {});
    res.json({ liked: true, likeCount: post.likeCount + 1 });
  }),
);

/** DELETE /community/posts/:id — author or admin */
router.delete(
  '/posts/:id',
  requireAuth,
  h(async (req, res) => {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || (post.authorId !== req.user.id && !isStaffSession(req.user))) throw ApiError.notFound('Post not found');
    await prisma.post.delete({ where: { id: post.id } });
    res.json({ ok: true });
  }),
);

// ── Safety reports ─────────────────────────────────────────────────────────

/** POST /community/reports { targetType, targetId, reason, details } */
router.post(
  '/reports',
  requireAuth,
  writeLimiter,
  validate({
    body: z.object({
      targetType: z.enum(['USER', 'POST', 'BUSINESS', 'SERVICE', 'MESSAGE']),
      targetId: z.string().min(1),
      reason: z.string().trim().min(3).max(120),
      details: z.string().trim().max(1000).optional(),
    }),
  }),
  h(async (req, res) => {
    await prisma.report.create({ data: { ...req.body, reporterId: req.user.id } });
    res.status(201).json({ message: 'Thank you. Our moderators will review this report.' });
  }),
);

export default router;
