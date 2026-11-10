import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth, requireProfile } from '../../middleware/auth.js';
import { requireMatrimonyAccess } from '../../middleware/membership.js';
import { privacyGate } from '../../middleware/privacy.js';
import { validate } from '../../middleware/validate.js';
import { h } from '../../utils/http.js';
import * as svc from './matrimonial.service.js';

const router = Router();

const browseQuery = z.object({
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  ageMin: z.coerce.number().int().min(18).max(80).optional(),
  ageMax: z.coerce.number().int().min(18).max(80).optional(),
  heightMin: z.coerce.number().int().min(100).max(250).optional(), // cm
  heightMax: z.coerce.number().int().min(100).max(250).optional(), // cm
  city: z.string().trim().max(60).optional(),
  education: z.enum(['GRADUATE', 'MASTERS', 'PROFESSIONAL']).optional(),
  maritalStatus: z.enum(['NEVER_MARRIED', 'DIVORCED', 'WIDOWED']).optional(),
  verified: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(60).optional(),
  sort: z.enum(['active', 'newest']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

/** GET /matrimonial/featured — landing-page showcase (public) */
router.get('/featured', optionalAuth, h(async (req, res) => res.json(await svc.featured(req.user?.id))));

/** GET /matrimonial/browse — filtered, paginated listing */
router.get('/browse', requireAuth, requireProfile, requireMatrimonyAccess, validate({ query: browseQuery }), h(async (req, res) => res.json(await svc.browse(req.user.id, req.query))));

/** GET /matrimonial/shortlist — my saved profiles */
router.get('/shortlist', requireAuth, requireMatrimonyAccess, h(async (req, res) => res.json(await svc.shortlist(req.user.id, req.query))));

/** POST /matrimonial/shortlist/:userId — toggle save */
router.post('/shortlist/:userId', requireAuth, requireMatrimonyAccess, h(async (req, res) => res.json(await svc.toggleShortlist(req.user.id, req.params.userId))));

/** GET /matrimonial/viewers — who viewed my profile */
router.get('/viewers', requireAuth, requireMatrimonyAccess, h(async (req, res) => res.json(await svc.viewers(req.user.id, req.query))));

/** GET /matrimonial/:userId — privacy-gated profile detail */
router.get('/:userId', requireAuth, privacyGate, h(async (req, res) => res.json(await svc.detail(req.user, req.params.userId, req.relationship))));

/** POST /matrimonial/:userId/request-family-contact — ask the member to add family contact numbers */
router.post('/:userId/request-family-contact', requireAuth, requireProfile, h(async (req, res) => res.json(await svc.requestFamilyContact(req.user.id, req.params.userId))));

/** GET /matrimonial/:userId/kundali — Guna Milan with this member */
router.get('/:userId/kundali', requireAuth, requireMatrimonyAccess, privacyGate, h(async (req, res) => res.json(await svc.kundali(req.user.id, req.params.userId, req.relationship))));

export default router;
