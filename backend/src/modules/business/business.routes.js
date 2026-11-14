import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { saveImage } from '../../lib/storage.js';
import { isAdminSession, optionalAuth, requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { normalizePhone } from '../../utils/format.js';
import { ApiError, h, pageResult, paginate } from '../../utils/http.js';

const router = Router();

export const BUSINESS_CATEGORIES = [
  'Agriculture',
  'Dairy & Poultry',
  'Shop & Retail',
  'Transport',
  'Construction',
  'Education',
  'Food & Catering',
  'Health & Clinic',
  'IT & Services',
  'Manufacturing',
  'Finance & Insurance',
  'Other',
];

const phone = z.string().transform((v, ctx) => {
  const p = normalizePhone(v);
  if (!p) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid 10-digit mobile number' });
  return p;
});

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.enum(BUSINESS_CATEGORIES),
  description: z.string().trim().max(1500).optional().nullable(),
  phone,
  contactName: z.string().trim().max(60, 'Name is too long').optional().nullable().or(z.literal('').transform(() => null)),
  // older form: just numbers
  extraPhones: z.array(phone).max(4, 'You can add up to 4 more numbers').optional(),
  // current form: a person name with each number
  extraContacts: z
    .array(z.object({ name: z.string().trim().max(60, 'Name is too long').optional().nullable(), phone }))
    .max(4, 'You can add up to 4 more numbers')
    .optional(),
  whatsapp: phone.optional().nullable().or(z.literal('').transform(() => null)),
  website: z.string().trim().url('Enter a valid URL (https://...)').optional().nullable().or(z.literal('').transform(() => null)),
  location: z.string().trim().min(2).max(120),
  photos: z.array(z.string().url()).optional(),
});

const select = {
  id: true,
  name: true,
  category: true,
  description: true,
  phone: true,
  extraPhones: true,
  contactName: true,
  extraNames: true,
  whatsapp: true,
  website: true,
  location: true,
  photos: true,
  status: true,
  createdAt: true,
  userId: true,
  user: { select: { profile: { select: { fullName: true, profilePhotoUrl: true, isVerified: true, isDemo: true } } } },
};

// Sample listings (added by the admin) never carry a phone number
const shape = (b) => {
  const isSample = Boolean(b.user?.profile?.isDemo);
  const { extraNames = [], ...rest } = b;
  // every extra number comes with the name of the person who answers it
  const extraContacts = (b.extraPhones || []).map((p, i) => ({ phone: p, name: extraNames[i] || '' }));
  return {
    ...rest,
    extraContacts,
    ...(isSample && { phone: null, extraPhones: [], extraContacts: [], contactName: null, whatsapp: null }),
    isSample,
    owner: b.user?.profile ? { userId: b.userId, ...b.user.profile } : null,
    user: undefined,
  };
};

/** Turns the form's numbers + names into the stored columns (no repeated numbers; names stay lined up with their numbers). */
function contactColumns(body) {
  const { extraContacts, extraPhones, ...rest } = body;
  const list = extraContacts ?? (extraPhones ? extraPhones.map((p) => ({ phone: p, name: '' })) : null);
  if (!list) return rest;
  const seen = new Set([rest.phone].filter(Boolean));
  const kept = list.filter((c) => !seen.has(c.phone) && seen.add(c.phone));
  return { ...rest, extraPhones: kept.map((c) => c.phone), extraNames: kept.map((c) => (c.name || '').trim()) };
}

/** GET /business/categories */
router.get('/categories', (_req, res) => res.json(BUSINESS_CATEGORIES));

/** GET /business?category&location&search&page */
router.get(
  '/',
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 12 });
    const { category, location, search } = req.query;
    const where = {
      isActive: true,
      status: 'APPROVED',
      ...(category && { category: String(category) }),
      ...(location && { location: { contains: String(location), mode: 'insensitive' } }),
      ...(search && {
        OR: [
          { name: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
          { category: { contains: String(search), mode: 'insensitive' } },
        ],
      }),
    };
    const [rows, total] = await Promise.all([
      prisma.business.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.business.count({ where }),
    ]);
    res.json(pageResult(rows.map((b) => ({ ...shape(b), phone: undefined, extraPhones: undefined, extraContacts: undefined, contactName: undefined, whatsapp: undefined })), total, { page, limit }));
  }),
);

/** GET /business/mine */
router.get(
  '/mine',
  requireAuth,
  h(async (req, res) => {
    const rows = await prisma.business.findMany({ where: { userId: req.user.id }, select, orderBy: { createdAt: 'desc' } });
    res.json(rows.map(shape));
  }),
);

/** GET /business/:id */
router.get(
  '/:id',
  optionalAuth,
  h(async (req, res) => {
    const b = await prisma.business.findUnique({ where: { id: req.params.id }, select });
    if (!b || (b.status !== 'APPROVED' && b.userId !== req.user?.id && !isAdminSession(req.user))) throw ApiError.notFound('Business not found');
    res.json({ ...shape(b), ...(!req.user && { phone: null, extraPhones: [], extraContacts: [], contactName: null, whatsapp: null }), isOwner: b.userId === req.user?.id });
  }),
);

/** POST /business/upload — listing photos */
router.post(
  '/upload',
  requireAuth,
  upload.array('photos'),
  h(async (req, res) => {
    if (!req.files?.length) throw ApiError.badRequest('Choose at least one photo');
    const saved = await Promise.all(req.files.map((f) => saveImage(f, 'business')));
    res.json({ urls: saved.map((s) => s.url) });
  }),
);

/** POST /business */
router.post(
  '/',
  requireAuth,
  validate({ body: schema }),
  h(async (req, res) => {
    const created = await prisma.business.create({ data: { ...contactColumns(req.body), photos: req.body.photos || [], userId: req.user.id }, select });
    res.status(201).json(shape(created));
  }),
);

/** PUT /business/:id */
router.put(
  '/:id',
  requireAuth,
  validate({ body: schema.partial() }),
  h(async (req, res) => {
    const b = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!b || (b.userId !== req.user.id && !isAdminSession(req.user))) throw ApiError.notFound('Business not found');
    res.json(shape(await prisma.business.update({ where: { id: b.id }, data: contactColumns({ phone: b.phone, ...req.body }), select })));
  }),
);

/** DELETE /business/:id */
router.delete(
  '/:id',
  requireAuth,
  h(async (req, res) => {
    const b = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!b || (b.userId !== req.user.id && !isAdminSession(req.user))) throw ApiError.notFound('Business not found');
    await prisma.business.delete({ where: { id: b.id } });
    res.json({ ok: true });
  }),
);

export default router;
