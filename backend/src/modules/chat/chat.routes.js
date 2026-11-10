import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireProfile } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { h } from '../../utils/http.js';
import * as svc from './chat.service.js';

const router = Router();
router.use(requireAuth);

/** GET /chat/conversations */
router.get('/conversations', h(async (req, res) => res.json(await svc.listConversations(req.user.id))));

/** POST /chat/open/:userId — get/create conversation with a connected member */
router.post('/open/:userId', h(async (req, res) => res.json(await svc.openWith(req.user.id, req.params.userId))));

/** POST /chat/open-listing { type: BUSINESS|SERVICE, id } — chat with a listing's owner (no follow needed) */
router.post(
  '/open-listing',
  requireProfile,
  validate({ body: z.object({ type: z.enum(['BUSINESS', 'SERVICE']), id: z.string().min(5).max(40) }) }),
  h(async (req, res) => res.json(await svc.openListingChat(req.user.id, req.body.type, req.body.id))),
);

/** GET /chat/:conversationId — conversation header info */
router.get('/:conversationId', h(async (req, res) => res.json(await svc.getConversation(req.params.conversationId, req.user.id))));

/** GET /chat/:conversationId/messages?before&limit */
router.get('/:conversationId/messages', h(async (req, res) => res.json(await svc.messages(req.params.conversationId, req.user.id, req.query))));

/** POST /chat/:receiverUserId/message { content } — REST fallback when sockets are unavailable */
router.post(
  '/:receiverUserId/message',
  writeLimiter,
  validate({ body: z.object({ content: z.string().trim().min(1).max(2000) }) }),
  h(async (req, res) => res.status(201).json(await svc.sendMessage(req.user.id, req.params.receiverUserId, req.body.content))),
);

/** PUT /chat/:conversationId/read */
router.put('/:conversationId/read', h(async (req, res) => res.json(await svc.markRead(req.params.conversationId, req.user.id))));

export default router;
