import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { saveImage } from '../../lib/storage.js';
import { isAdminSession, requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { ApiError, h, pageResult, paginate } from '../../utils/http.js';

const router = Router();

const optStr = (max = 120) => z.string().trim().max(max).optional().nullable().or(z.literal('').transform(() => null));

const schema = z
  .object({
    type: z.enum(['ACADEMIC', 'PROFESSIONAL']),
    name: z.string().trim().min(2).max(80),
    photoUrl: z.string().url().optional().nullable(),
    description: optStr(800),
    schoolName: optStr(),
    percentage: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(100).nullable().optional()),
    grade: optStr(40),
    year: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(1950).max(2100).nullable().optional()),
    stream: optStr(60),
    role: optStr(),
    company: optStr(),
    city: optStr(60),
    linkedinUrl: z.string().url().optional().nullable().or(z.literal('').transform(() => null)),
  })
  .refine((d) => d.type !== 'ACADEMIC' || (d.schoolName && d.grade), { message: 'School and class/grade are required', path: ['schoolName'] })
  .refine((d) => d.type !== 'PROFESSIONAL' || (d.role && d.company), { message: 'Role and organisation are required', path: ['role'] });

/** GET /achievers?type&year&grade&page — verified achievements only */
router.get(
  '/',
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 12 });
    const { type, year, grade, q } = req.query;
    const where = {
      isVerified: true,
      ...(type && ['ACADEMIC', 'PROFESSIONAL'].includes(type) && { type }),
      ...(year && { year: Number(year) }),
      ...(grade && { grade: String(grade) }),
      ...(q && { OR: [{ name: { contains: String(q), mode: 'insensitive' } }, { company: { contains: String(q), mode: 'insensitive' } }, { schoolName: { contains: String(q), mode: 'insensitive' } }] }),
    };
    const orderBy = type === 'ACADEMIC' ? [{ year: 'desc' }, { percentage: 'desc' }] : [{ createdAt: 'desc' }];
    const [items, total] = await Promise.all([prisma.achievement.findMany({ where, orderBy, skip, take }), prisma.achievement.count({ where })]);
    res.json(pageResult(items, total, { page, limit }));
  }),
);

/** GET /achievers/years — for the filter dropdown */
router.get(
  '/years',
  h(async (_req, res) => {
    const rows = await prisma.achievement.findMany({ where: { isVerified: true, year: { not: null } }, distinct: ['year'], select: { year: true }, orderBy: { year: 'desc' } });
    res.json(rows.map((r) => r.year));
  }),
);

/** GET /achievers/mine — my submissions incl. pending */
router.get('/mine', requireAuth, h(async (req, res) => res.json(await prisma.achievement.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }))));

/** POST /achievers/upload — photo */
router.post(
  '/upload',
  requireAuth,
  upload.single('photo'),
  h(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Choose a photo');
    const saved = await saveImage(req.file, 'achievers');
    res.json({ url: saved.url });
  }),
);

/** POST /achievers — submit (pending verification by admin) */
router.post(
  '/',
  requireAuth,
  validate({ body: schema }),
  h(async (req, res) => {
    const created = await prisma.achievement.create({ data: { ...req.body, userId: req.user.id, isVerified: isAdminSession(req.user) } });
    res.status(201).json(created);
  }),
);

/** DELETE /achievers/:id — owner or admin */
router.delete(
  '/:id',
  requireAuth,
  h(async (req, res) => {
    const a = await prisma.achievement.findUnique({ where: { id: req.params.id } });
    if (!a || (a.userId !== req.user.id && !isAdminSession(req.user))) throw ApiError.notFound('Not found');
    await prisma.achievement.delete({ where: { id: a.id } });
    res.json({ ok: true });
  }),
);

export default router;
