import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { h } from '../../utils/http.js';
import { intentsSchema, profileSchema, settingsSchema, updateProfileSchema } from './users.schema.js';
import * as users from './users.service.js';

const router = Router();
router.use(requireAuth);

/** GET /users/me — session user with own profile and unread counters */
router.get('/me', h(async (req, res) => res.json(await users.sessionUser(req.user.id))));

/** POST /users/me/profile — first-time profile setup */
router.post('/me/profile', validate({ body: profileSchema }), h(async (req, res) => res.status(201).json(await users.createProfile(req.user.id, req.body))));

/** PUT /users/me — update profile */
router.put('/me', validate({ body: updateProfileSchema }), h(async (req, res) => res.json(await users.updateProfile(req.user.id, req.body))));

/** PUT /users/me/intents — "What brings you here?" */
router.put('/me/intents', validate({ body: intentsSchema }), h(async (req, res) => res.json(await users.setIntents(req.user.id, req.body.intents))));

/** PUT /users/me/settings — privacy & visibility */
router.put(
  '/me/settings',
  validate({ body: settingsSchema }),
  h(async (req, res) => {
    if (req.body.isMatrimonial) users.assertMatrimonyReady({ ...(await prisma.profile.findUnique({ where: { userId: req.user.id } })), ...req.body });
    await prisma.profile.update({ where: { userId: req.user.id }, data: req.body });
    res.json(await users.sessionUser(req.user.id));
  }),
);

/** GET /users/me/stats — followers / following / profile views / posts */
router.get('/me/stats', h(async (req, res) => res.json(await users.myStats(req.user.id))));

/** POST /users/me/photos — multipart "photos" (max 5 total; any size — compressed on upload) */
router.post('/me/photos', upload.array('photos'), h(async (req, res) => res.json(await users.addPhotos(req.user.id, req.files))));

/** PUT /users/me/photos/:photoId/primary */
router.put('/me/photos/:photoId/primary', h(async (req, res) => res.json(await users.makePrimaryPhoto(req.user.id, req.params.photoId))));

/** DELETE /users/me/photos/:photoId */
router.delete('/me/photos/:photoId', h(async (req, res) => res.json(await users.deletePhoto(req.user.id, req.params.photoId))));

/** DELETE /users/me — permanently delete account and all data */
router.delete(
  '/me',
  h(async (req, res) => {
    await users.deleteAccount(req.user.id);
    res.clearCookie('mv_rt', { path: '/api/v1/auth' });
    res.json({ message: 'Account deleted' });
  }),
);

export default router;
