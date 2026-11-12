import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { saveImage } from '../../lib/storage.js';
import { isAdminSession, optionalAuth, requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { normalizePhone } from '../../utils/format.js';
import { ApiError, h, pageResult, paginate } from '../../utils/http.js';

/**
 * Wedding services marketplace.
 * New provider listings start as PENDING and become public after admin approval.
 */
const router = Router();

const phone = z.string().transform((v, ctx) => {
  const p = normalizePhone(v);
  if (!p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit mobile number' });
  return p;
});

const providerSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  categoryId: z.string().min(1, 'Choose a category'),
  description: z.string().trim().max(1500).optional().nullable(),
  phone,
  whatsapp: phone.optional().nullable().or(z.literal('').transform(() => null)),
  location: z.string().trim().min(2).max(120),
  priceFrom: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(0).max(100_000_000).nullable().optional()),
  experienceYears: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(0).max(80).nullable().optional()),
  photos: z.array(z.string().url()).optional(),
});

const providerSelect = {
  id: true,
  businessName: true,
  description: true,
  location: true,
  priceFrom: true,
  photos: true,
  isFeatured: true,
  ratingAvg: true,
  ratingCount: true,
  status: true,
  createdAt: true,
  userId: true,
  phone: true,
  whatsapp: true,
  category: { select: { id: true, name: true, nameMr: true, slug: true, icon: true } },
  user: { select: { profile: { select: { isDemo: true } } } },
};
/** Marks sample listings (added by the admin) and removes the owner record + any phone number from the response. */
const asSample = ({ user, ...p }) => {
  const isSample = Boolean(user?.profile?.isDemo);
  return { ...p, isSample, ...(isSample && 'phone' in p && { phone: null, whatsapp: null }) };
};
/** Listing cards never carry contact numbers (they are shown on the detail page to logged-in members). */
const { phone: _p, whatsapp: _w, ...listSelect } = providerSelect;

/** GET /services/categories — with approved provider counts */
router.get(
  '/categories',
  h(async (_req, res) => {
    const cats = await prisma.serviceCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { providers: { where: { status: 'APPROVED', isActive: true } } } } },
    });
    res.json(cats.map(({ _count, ...c }) => ({ ...c, providerCount: _count.providers })));
  }),
);

/** GET /services/combos — active combo packages */
router.get(
  '/combos',
  h(async (_req, res) => {
    const combos = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { price: 'asc' }],
      include: { providers: { where: { status: 'APPROVED' }, select: { id: true, businessName: true, location: true, category: { select: { name: true, icon: true } } } } },
    });
    res.json(combos);
  }),
);

/** GET /services/featured — featured providers for the services landing */
router.get(
  '/featured',
  h(async (_req, res) => {
    const rows = await prisma.serviceProvider.findMany({
      where: { status: 'APPROVED', isActive: true, isFeatured: true },
      select: listSelect,
      orderBy: { ratingAvg: 'desc' },
      take: 4,
    });
    res.json(rows.map(asSample));
  }),
);

/** GET /services/mine — my listings (any status) */
router.get(
  '/mine',
  requireAuth,
  h(async (req, res) => {
    res.json(await prisma.serviceProvider.findMany({ where: { userId: req.user.id }, select: providerSelect, orderBy: { createdAt: 'desc' } }));
  }),
);

/** GET /services/provider/:id — provider detail with reviews */
router.get(
  '/provider/:id',
  optionalAuth,
  h(async (req, res) => {
    const p = await prisma.serviceProvider.findUnique({
      where: { id: req.params.id },
      select: {
        ...providerSelect,
        packages: { where: { isActive: true }, select: { id: true, title: true, price: true, originalPrice: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { id: true, rating: true, comment: true, createdAt: true, userId: true, user: { select: { profile: { select: { fullName: true, profilePhotoUrl: true } } } } },
        },
      },
    });
    const isOwner = p && req.user?.id === p.userId;
    if (!p || (p.status !== 'APPROVED' && !isOwner && !isAdminSession(req.user))) throw ApiError.notFound('Service not found');
    res.json({
      ...asSample(p),
      phone: req.user && !p.user?.profile?.isDemo ? p.phone : null,
      whatsapp: req.user && !p.user?.profile?.isDemo ? p.whatsapp : null,
      isOwner,
      reviews: p.reviews.map((r) => ({ ...r, user: { fullName: r.user.profile?.fullName || 'Member', photoUrl: r.user.profile?.profilePhotoUrl } })),
      myReview: req.user ? p.reviews.find((r) => r.userId === req.user.id) || null : null,
    });
  }),
);

/** GET /services/:categorySlug?q&location&page — providers in a category */
router.get(
  '/:categorySlug',
  h(async (req, res) => {
    const category = await prisma.serviceCategory.findUnique({ where: { slug: req.params.categorySlug } });
    if (!category) throw ApiError.notFound('Category not found');
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 12 });
    const { q, location, sort } = req.query;
    const where = {
      categoryId: category.id,
      status: 'APPROVED',
      isActive: true,
      ...(location && { location: { contains: String(location), mode: 'insensitive' } }),
      ...(q && {
        OR: [
          { businessName: { contains: String(q), mode: 'insensitive' } },
          { description: { contains: String(q), mode: 'insensitive' } },
        ],
      }),
    };
    const orderBy =
      sort === 'price' ? [{ priceFrom: { sort: 'asc', nulls: 'last' } }] : [{ isFeatured: 'desc' }, { ratingAvg: 'desc' }, { createdAt: 'desc' }];
    const [items, total] = await Promise.all([
      prisma.serviceProvider.findMany({ where, select: listSelect, orderBy, skip, take }),
      prisma.serviceProvider.count({ where }),
    ]);
    res.json({ category, ...pageResult(items.map(asSample), total, { page, limit }) });
  }),
);

/** POST /services/upload — upload listing photos, returns URLs */
router.post(
  '/upload',
  requireAuth,
  upload.array('photos'),
  h(async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest('Choose at least one photo');
    const saved = await Promise.all(req.files.map((f) => saveImage(f, 'services')));
    res.json({ urls: saved.map((s) => s.url) });
  }),
);

/** POST /services — create a listing (pending approval) */
router.post(
  '/',
  requireAuth,
  validate({ body: providerSchema }),
  h(async (req, res) => {
    const cat = await prisma.serviceCategory.findUnique({ where: { id: req.body.categoryId } });
    if (!cat) throw ApiError.badRequest('Invalid category');
    const autoApprove = isAdminSession(req.user);
    const created = await prisma.serviceProvider.create({
      data: { ...req.body, photos: req.body.photos || [], userId: req.user.id, status: autoApprove ? 'APPROVED' : 'PENDING' },
      select: providerSelect,
    });
    res.status(201).json(created);
  }),
);

/** PUT /services/:id — owner update (re-enters review if previously rejected) */
router.put(
  '/:id',
  requireAuth,
  validate({ body: providerSchema.partial() }),
  h(async (req, res) => {
    const p = await prisma.serviceProvider.findUnique({ where: { id: req.params.id } });
    if (!p || (p.userId !== req.user.id && !isAdminSession(req.user))) throw ApiError.notFound('Service not found');
    const updated = await prisma.serviceProvider.update({
      where: { id: p.id },
      data: { ...req.body, ...(p.status === 'REJECTED' && { status: 'PENDING' }) },
      select: providerSelect,
    });
    res.json(updated);
  }),
);

/** DELETE /services/:id */
router.delete(
  '/:id',
  requireAuth,
  h(async (req, res) => {
    const p = await prisma.serviceProvider.findUnique({ where: { id: req.params.id } });
    if (!p || (p.userId !== req.user.id && !isAdminSession(req.user))) throw ApiError.notFound('Service not found');
    await prisma.serviceProvider.delete({ where: { id: p.id } });
    res.json({ ok: true });
  }),
);

/** POST /services/provider/:id/reviews { rating, comment } — one review per member, upserted */
router.post(
  '/provider/:id/reviews',
  requireAuth,
  validate({ body: z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(800).optional() }) }),
  h(async (req, res) => {
    const p = await prisma.serviceProvider.findUnique({ where: { id: req.params.id } });
    if (!p || p.status !== 'APPROVED') throw ApiError.notFound('Service not found');
    if (p.userId === req.user.id) throw ApiError.badRequest('You cannot review your own service');
    await prisma.serviceReview.upsert({
      where: { providerId_userId: { providerId: p.id, userId: req.user.id } },
      create: { providerId: p.id, userId: req.user.id, rating: req.body.rating, comment: req.body.comment },
      update: { rating: req.body.rating, comment: req.body.comment },
    });
    const agg = await prisma.serviceReview.aggregate({ where: { providerId: p.id }, _avg: { rating: true }, _count: true });
    await prisma.serviceProvider.update({
      where: { id: p.id },
      data: { ratingAvg: Number((agg._avg.rating || 0).toFixed(2)), ratingCount: agg._count },
    });
    res.json({ ok: true, ratingAvg: agg._avg.rating, ratingCount: agg._count });
  }),
);

export default router;
