import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { unreadCounts } from '../../services/notification.service.js';
import { h, pageResult, paginate } from '../../utils/http.js';

const router = Router();
router.use(requireAuth);

/** GET /notifications?page&limit — includes the sender's name/photo */
router.get(
  '/',
  h(async (req, res) => {
    const { page, limit, skip, take } = paginate(req.query, { defaultLimit: 20 });
    const where = { userId: req.user.id };
    const [rows, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.notification.count({ where }),
    ]);
    const fromIds = [...new Set(rows.map((r) => r.fromUserId).filter(Boolean))];
    const senders = await prisma.profile.findMany({
      where: { userId: { in: fromIds } },
      select: { userId: true, fullName: true, profilePhotoUrl: true, profilePhotoBlurUrl: true, accountType: true },
    });
    const map = new Map(senders.map((s) => [s.userId, s]));
    res.json(
      pageResult(
        rows.map((r) => {
          const s = map.get(r.fromUserId);
          return { ...r, from: s ? { userId: s.userId, fullName: s.fullName, photoUrl: s.profilePhotoUrl } : null };
        }),
        total,
        { page, limit },
      ),
    );
  }),
);

/** GET /notifications/unread — badge counters */
router.get('/unread', h(async (req, res) => res.json(await unreadCounts(req.user.id))));

/** PUT /notifications/read-all */
router.put(
  '/read-all',
  h(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ ok: true });
  }),
);

/** PUT /notifications/:id/read */
router.put(
  '/:id/read',
  h(async (req, res) => {
    await prisma.notification.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { isRead: true } });
    res.json({ ok: true });
  }),
);

/** DELETE /notifications/:id */
router.delete(
  '/:id',
  h(async (req, res) => {
    await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ ok: true });
  }),
);

export default router;
