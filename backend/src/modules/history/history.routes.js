import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { h } from '../../utils/http.js';

/** Public community history timeline (admin CRUD lives in admin.routes.js). */
const router = Router();

/** GET /history — published entries, sorted */
router.get(
  '/',
  h(async (_req, res) => {
    res.json(await prisma.historyEntry.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }));
  }),
);

export default router;
