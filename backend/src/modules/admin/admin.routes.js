import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { notify } from '../../services/notification.service.js';
import { saveImage, saveVideo } from '../../lib/storage.js';
import { upload, videoUpload } from '../../middleware/upload.js';
import { ApiError, h, pageResult, paginate } from '../../utils/http.js';
import { adminGate, auditMutations } from './admin.guard.js';
import manage from './manage.routes.js';

/** Admin panel API — every route requires role ADMIN (moderators get moderation routes). */
const router = Router();
router.use(requireAuth);
router.use(adminGate);
router.use(auditMutations);
const admin = requireRole('ADMIN');
const mod = requireRole('ADMIN', 'MODERATOR');

/** GET /admin/stats */
router.get(
  '/stats',
  mod,
  h(async (_req, res) => {
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const [users, profiles, matrimonial, follows, messages, posts, businesses, pendingServices, pendingAchievements, openReports, newThisWeek] = await Promise.all([
      prisma.user.count(),
      prisma.profile.count(),
      prisma.profile.count({ where: { isMatrimonial: true } }),
      prisma.follow.count({ where: { status: 'ACCEPTED' } }),
      prisma.message.count(),
      prisma.post.count(),
      prisma.business.count(),
      prisma.serviceProvider.count({ where: { status: 'PENDING' } }),
      prisma.achievement.count({ where: { isVerified: false } }),
      prisma.report.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);
    res.json({ users, profiles, matrimonial, follows, messages, posts, businesses, pendingServices, pendingAchievements, openReports, newThisWeek });
  }),
);

// ── Service provider moderation ────────────────────────────────────────────
router.get(
  '/services',
  mod,
  h(async (req, res) => {
    const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status) ? req.query.status : 'PENDING';
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 20 });
    const where = { status };
    const [items, total] = await Promise.all([
      prisma.serviceProvider.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { category: true, user: { select: { phone: true, profile: { select: { fullName: true } } } } },
      }),
      prisma.serviceProvider.count({ where }),
    ]);
    res.json(pageResult(items, total, { page, limit }));
  }),
);

router.put(
  '/services/:id',
  mod,
  validate({ body: z.object({ status: z.enum(['APPROVED', 'REJECTED', 'PENDING']).optional(), isFeatured: z.boolean().optional() }) }),
  h(async (req, res) => {
    const updated = await prisma.serviceProvider.update({ where: { id: req.params.id }, data: req.body });
    if (req.body.status === 'APPROVED' || req.body.status === 'REJECTED') {
      await notify({
        userId: updated.userId,
        type: req.body.status === 'APPROVED' ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
        content:
          req.body.status === 'APPROVED'
            ? `Your service "${updated.businessName}" is now live on Mi Vanjari`
            : `Your service "${updated.businessName}" needs changes before it can go live`,
        link: `/services/provider/${updated.id}`,
      });
    }
    res.json(updated);
  }),
);

// ── Achievements verification ──────────────────────────────────────────────
router.get(
  '/achievements',
  mod,
  h(async (req, res) => {
    const verified = req.query.verified === 'true';
    res.json(
      await prisma.achievement.findMany({
        where: { isVerified: verified },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { phone: true, profile: { select: { fullName: true } } } } },
      }),
    );
  }),
);

router.put(
  '/achievements/:id',
  mod,
  validate({ body: z.object({ isVerified: z.boolean() }) }),
  h(async (req, res) => {
    const a = await prisma.achievement.update({ where: { id: req.params.id }, data: { isVerified: req.body.isVerified } });
    if (a.isVerified) await notify({ userId: a.userId, type: 'ACHIEVEMENT_VERIFIED', content: `"${a.name}" is now featured among our achievers 🎉`, link: '/achievers' });
    res.json(a);
  }),
);

router.delete('/achievements/:id', mod, h(async (req, res) => res.json(await prisma.achievement.delete({ where: { id: req.params.id } }))));

// ── Community history CRUD ─────────────────────────────────────────────────
const historySchema = z.object({
  era: z.string().trim().min(1).max(60),
  yearRange: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().max(120).optional().nullable(),
  content: z.string().trim().min(1).max(5000),
  imageUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  videoUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  sortOrder: z.coerce.number().int().optional(),
  isPublished: z.boolean().optional(),
});

/** POST /admin/history/media/image — multipart 'image' → { url } (any size; compressed by sharp) */
router.post(
  '/history/media/image',
  admin,
  upload.single('image'),
  h(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose an image');
    res.json({ url: (await saveImage(req.file, 'history')).url });
  }),
);

/** POST /admin/history/media/video — multipart 'video' (MP4/WebM/MOV, ≤ 300 MB) → { url } */
router.post(
  '/history/media/video',
  admin,
  videoUpload.single('video'),
  h(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a video');
    res.json({ url: (await saveVideo(req.file)).url });
  }),
);

router.get('/history', admin, h(async (_req, res) => res.json(await prisma.historyEntry.findMany({ orderBy: { sortOrder: 'asc' } }))));
router.post('/history', admin, validate({ body: historySchema }), h(async (req, res) => res.status(201).json(await prisma.historyEntry.create({ data: req.body }))));
router.put('/history/:id', admin, validate({ body: historySchema.partial() }), h(async (req, res) => res.json(await prisma.historyEntry.update({ where: { id: req.params.id }, data: req.body }))));
router.delete('/history/:id', admin, h(async (req, res) => res.json(await prisma.historyEntry.delete({ where: { id: req.params.id } }))));

// ── Muhurat dates CRUD ─────────────────────────────────────────────────────
const muhuratSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().trim().min(1).max(30).default('VIVAH'),
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).optional().nullable(),
});
const toMuhurat = (b) => ({ ...b, ...(b.date && { date: new Date(`${b.date}T00:00:00Z`) }) });
router.post('/muhurat', admin, validate({ body: muhuratSchema }), h(async (req, res) => res.status(201).json(await prisma.muhuratDate.create({ data: toMuhurat(req.body) }))));
router.delete('/muhurat/:id', admin, h(async (req, res) => res.json(await prisma.muhuratDate.delete({ where: { id: req.params.id } }))));

// ── Combo packages CRUD ────────────────────────────────────────────────────
const packageSchema = z.object({
  title: z.string().trim().min(2).max(120),
  titleMr: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.coerce.number().int().min(0),
  originalPrice: z.coerce.number().int().min(0).optional().nullable(),
  includes: z.array(z.string().trim().min(1)).max(20),
  imageUrl: z.string().url().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  providerIds: z.array(z.string()).optional(),
});
const toPackage = ({ providerIds, ...rest }, update = false) => ({
  ...rest,
  ...(providerIds && { providers: update ? { set: providerIds.map((id) => ({ id })) } : { connect: providerIds.map((id) => ({ id })) } }),
});
router.get('/packages', admin, h(async (_req, res) => res.json(await prisma.package.findMany({ orderBy: { createdAt: 'desc' }, include: { providers: { select: { id: true, businessName: true } } } }))));
router.post('/packages', admin, validate({ body: packageSchema }), h(async (req, res) => res.status(201).json(await prisma.package.create({ data: toPackage(req.body) }))));
router.put('/packages/:id', admin, validate({ body: packageSchema.partial() }), h(async (req, res) => res.json(await prisma.package.update({ where: { id: req.params.id }, data: toPackage(req.body, true) }))));
router.delete('/packages/:id', admin, h(async (req, res) => res.json(await prisma.package.delete({ where: { id: req.params.id } }))));

// ── Reports & user moderation ──────────────────────────────────────────────
router.get(
  '/reports',
  mod,
  h(async (req, res) => {
    const status = ['OPEN', 'REVIEWED', 'DISMISSED'].includes(req.query.status) ? req.query.status : 'OPEN';
    res.json(
      await prisma.report.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { reporter: { select: { profile: { select: { fullName: true } } } } },
      }),
    );
  }),
);

router.put(
  '/reports/:id',
  mod,
  validate({ body: z.object({ status: z.enum(['OPEN', 'REVIEWED', 'DISMISSED']) }) }),
  h(async (req, res) =>
    res.json(await prisma.report.update({ where: { id: req.params.id }, data: { status: req.body.status, resolvedById: req.user.id, resolvedAt: new Date() } })),
  ),
);

// Users, payments, settings and the audit log live in manage.routes.js
router.use(manage);

export default router;
