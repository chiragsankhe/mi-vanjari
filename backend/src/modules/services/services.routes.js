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
 * New provider listings go live immediately; an admin can reject or hide them afterwards.
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
  subcategoryIds: z.array(z.string().min(1)).max(15).optional(),
});

const optText = (max) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const packageSchema = z.object({
  name: z.string().trim().min(2, 'Give the package a name').max(100),
  price: z.coerce.number({ invalid_type_error: 'Enter the price' }).int().min(0).max(100_000_000),
  description: optText(1500),
  photos: z.array(z.string().url()).max(12).optional(),
  includes: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  duration: optText(60),
  details: optText(1500),
});
const MAX_PACKAGES = 30;

/** lower-case letters + digits — "Dhol  Tasha" and "dhol-tasha" count as the same name */
const nameKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
const slugify = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'category';
/** Categories a member may see: approved ones, plus anything they suggested themselves (admins see all). */
const visibleTo = (user) => (isAdminSession(user) ? {} : user ? { OR: [{ isApproved: true }, { createdById: user.id }] } : { isApproved: true });
const canUse = (row, user) => row && (row.isApproved || row.createdById === user?.id || isAdminSession(user));

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
  category: { select: { id: true, name: true, nameMr: true, slug: true, icon: true, isApproved: true } },
  subcategories: { select: { id: true, name: true, isApproved: true }, orderBy: { sortOrder: 'asc' } },
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
  optionalAuth,
  h(async (req, res) => {
    const cats = await prisma.serviceCategory.findMany({
      where: visibleTo(req.user),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { providers: { where: { status: 'APPROVED', isActive: true } } } },
        subcategories: { where: visibleTo(req.user), orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, isApproved: true } },
      },
    });
    res.json(cats.map(({ _count, createdById, ...c }) => ({ ...c, providerCount: _count.providers, mine: createdById === req.user?.id })));
  }),
);

/** Max suggestions a member can have waiting for approval at once (stops spam) */
const PENDING_CAP = 5;

/** POST /services/categories { name, nameMr? } — a provider suggests a category that is missing (admin approves it) */
router.post(
  '/categories',
  requireAuth,
  validate({ body: z.object({ name: z.string().trim().min(2, 'Enter a category name').max(60), nameMr: optText(80) }) }),
  h(async (req, res) => {
    const key = nameKey(req.body.name);
    if (!key) throw ApiError.badRequest('Enter a valid category name');
    const same = await prisma.serviceCategory.findUnique({ where: { key } });
    if (same) {
      if (!canUse(same, req.user)) throw ApiError.conflict('Another provider just suggested this category and it is waiting for approval. Choose the closest category for now.', 'CATEGORY_PENDING');
      return res.json({ ...same, existed: true });
    }
    const admin = isAdminSession(req.user);
    if (!admin && (await prisma.serviceCategory.count({ where: { createdById: req.user.id, isApproved: false } })) >= PENDING_CAP) {
      throw ApiError.badRequest('You already have several new categories waiting for approval. Please wait for them to be reviewed.');
    }
    let slug = slugify(req.body.name);
    if (await prisma.serviceCategory.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const last = await prisma.serviceCategory.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.serviceCategory.create({
      data: { name: req.body.name, nameMr: req.body.nameMr, slug, key, icon: 'grid', sortOrder: (last._max.sortOrder || 0) + 1, isApproved: admin, createdById: req.user.id },
    });
    res.status(201).json({ ...created, existed: false, subcategories: [], providerCount: 0 });
  }),
);

/** POST /services/categories/:id/subcategories { name } — suggest a missing subcategory */
router.post(
  '/categories/:id/subcategories',
  requireAuth,
  validate({ body: z.object({ name: z.string().trim().min(2, 'Enter a name').max(60) }) }),
  h(async (req, res) => {
    const cat = await prisma.serviceCategory.findUnique({ where: { id: req.params.id } });
    if (!canUse(cat, req.user)) throw ApiError.notFound('Category not found');
    const key = nameKey(req.body.name);
    if (!key) throw ApiError.badRequest('Enter a valid name');
    const same = await prisma.serviceSubcategory.findUnique({ where: { categoryId_key: { categoryId: cat.id, key } } });
    if (same) {
      if (!canUse(same, req.user)) throw ApiError.conflict('Another provider just suggested this and it is waiting for approval.', 'CATEGORY_PENDING');
      return res.json({ id: same.id, name: same.name, isApproved: same.isApproved, existed: true });
    }
    const admin = isAdminSession(req.user);
    if (!admin && (await prisma.serviceSubcategory.count({ where: { createdById: req.user.id, isApproved: false } })) >= PENDING_CAP * 2) {
      throw ApiError.badRequest('You already have several new options waiting for approval. Please wait for them to be reviewed.');
    }
    const last = await prisma.serviceSubcategory.aggregate({ where: { categoryId: cat.id }, _max: { sortOrder: true } });
    const created = await prisma.serviceSubcategory.create({
      data: { categoryId: cat.id, name: req.body.name, key, sortOrder: (last._max.sortOrder || 0) + 1, isApproved: admin, createdById: req.user.id },
    });
    res.status(201).json({ id: created.id, name: created.name, isApproved: created.isApproved, existed: false });
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
        servicePackages: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
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
    const { q, location, sort, sub } = req.query;
    const where = {
      categoryId: category.id,
      ...(sub && { subcategories: { some: { id: String(sub) } } }),
      status: 'APPROVED',
      isActive: true,
      ...(location && { location: { contains: String(location), mode: 'insensitive' } }),
      ...(q && {
        OR: [
          { businessName: { contains: String(q), mode: 'insensitive' } },
          { description: { contains: String(q), mode: 'insensitive' } },
          { servicePackages: { some: { name: { contains: String(q), mode: 'insensitive' } } } },
        ],
      }),
    };
    const orderBy =
      sort === 'price' ? [{ priceFrom: { sort: 'asc', nulls: 'last' } }] : [{ isFeatured: 'desc' }, { ratingAvg: 'desc' }, { createdAt: 'desc' }];
    const [items, total] = await Promise.all([
      prisma.serviceProvider.findMany({ where, select: listSelect, orderBy, skip, take }),
      prisma.serviceProvider.count({ where }),
    ]);
    const subcategories = await prisma.serviceSubcategory.findMany({ where: { categoryId: category.id, isApproved: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } });
    res.json({ category: { ...category, subcategories }, ...pageResult(items.map(asSample), total, { page, limit }) });
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

/** Subcategory ids a member may attach to a listing of this category → [{ id }] (throws if any is unknown) */
async function checkSubcategories(ids, categoryId, user) {
  const unique = [...new Set(ids || [])];
  if (!unique.length) return [];
  const rows = await prisma.serviceSubcategory.findMany({ where: { id: { in: unique }, categoryId } });
  if (rows.length !== unique.length || rows.some((r) => !canUse(r, user))) throw ApiError.badRequest('One of the selected options is not valid for this category');
  return unique.map((id) => ({ id }));
}

/** POST /services — create a listing (pending approval) */
router.post(
  '/',
  requireAuth,
  validate({ body: providerSchema }),
  h(async (req, res) => {
    const { subcategoryIds, ...fields } = req.body;
    const cat = await prisma.serviceCategory.findUnique({ where: { id: fields.categoryId } });
    if (!canUse(cat, req.user)) throw ApiError.badRequest('Invalid category');
    const subs = await checkSubcategories(subcategoryIds, cat.id, req.user);
    // Listings go live at once (the admin can still reject or hide any of them afterwards).
    // The category / options the provider suggested become public with it, otherwise the listing would be hidden.
    const created = await prisma.serviceProvider.create({
      data: { ...fields, photos: fields.photos || [], userId: req.user.id, status: 'APPROVED', subcategories: { connect: subs } },
      select: providerSelect,
    });
    if (!cat.isApproved) await prisma.serviceCategory.update({ where: { id: cat.id }, data: { isApproved: true } });
    if (subs.length) await prisma.serviceSubcategory.updateMany({ where: { id: { in: subs.map((s) => s.id) }, isApproved: false }, data: { isApproved: true } });
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
    const { subcategoryIds, ...fields } = req.body;
    if (fields.categoryId) {
      const cat = await prisma.serviceCategory.findUnique({ where: { id: fields.categoryId } });
      if (!canUse(cat, req.user)) throw ApiError.badRequest('Invalid category');
    }
    const categoryId = fields.categoryId || p.categoryId;
    // changing the category clears subcategories of the old one unless new ones are sent
    const subs = subcategoryIds ? await checkSubcategories(subcategoryIds, categoryId, req.user) : fields.categoryId && fields.categoryId !== p.categoryId ? [] : null;
    const updated = await prisma.serviceProvider.update({
      where: { id: p.id },
      data: { ...fields, ...(subs && { subcategories: { set: subs } }), ...(p.status === 'REJECTED' && { status: 'PENDING' }) },
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

// ── Provider packages — every provider manages their own ───────────────────

const ownedProvider = async (providerId, user) => {
  const p = await prisma.serviceProvider.findUnique({ where: { id: providerId }, select: { id: true, userId: true } });
  if (!p || (p.userId !== user.id && !isAdminSession(user))) throw ApiError.notFound('Service not found');
  return p;
};

/** POST /services/provider/:id/packages */
router.post(
  '/provider/:id/packages',
  requireAuth,
  validate({ body: packageSchema }),
  h(async (req, res) => {
    const p = await ownedProvider(req.params.id, req.user);
    const count = await prisma.servicePackage.count({ where: { providerId: p.id } });
    if (count >= MAX_PACKAGES) throw ApiError.badRequest(`You can add up to ${MAX_PACKAGES} packages`);
    const last = await prisma.servicePackage.aggregate({ where: { providerId: p.id }, _max: { sortOrder: true } });
    const created = await prisma.servicePackage.create({
      data: { ...req.body, photos: req.body.photos || [], includes: req.body.includes || [], providerId: p.id, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    res.status(201).json(created);
  }),
);

/** PUT /services/packages/:pid */
router.put(
  '/packages/:pid',
  requireAuth,
  validate({ body: packageSchema.partial() }),
  h(async (req, res) => {
    const pk = await prisma.servicePackage.findUnique({ where: { id: req.params.pid } });
    if (!pk) throw ApiError.notFound('Package not found');
    await ownedProvider(pk.providerId, req.user);
    res.json(await prisma.servicePackage.update({ where: { id: pk.id }, data: req.body }));
  }),
);

/** DELETE /services/packages/:pid */
router.delete(
  '/packages/:pid',
  requireAuth,
  h(async (req, res) => {
    const pk = await prisma.servicePackage.findUnique({ where: { id: req.params.pid } });
    if (!pk) throw ApiError.notFound('Package not found');
    await ownedProvider(pk.providerId, req.user);
    await prisma.servicePackage.delete({ where: { id: pk.id } });
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
