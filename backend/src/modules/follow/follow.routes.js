import { Router } from 'express';
import { requireAuth, requireProfile } from '../../middleware/auth.js';
import { writeLimiter } from '../../middleware/rateLimit.js';
import { h } from '../../utils/http.js';
import * as svc from './follow.service.js';

const router = Router();
router.use(requireAuth);

router.get('/requests', h(async (req, res) => res.json(await svc.receivedRequests(req.user.id, req.query))));
router.get('/requests/sent', h(async (req, res) => res.json(await svc.sentRequests(req.user.id, req.query))));
router.get('/followers', h(async (req, res) => res.json(await svc.list(req.user.id, 'followers', req.query))));
router.get('/following', h(async (req, res) => res.json(await svc.list(req.user.id, 'following', req.query))));
router.get('/blocked', h(async (req, res) => res.json(await svc.blockedList(req.user.id))));
router.get('/status/:targetUserId', h(async (req, res) => res.json(await svc.status(req.user.id, req.params.targetUserId))));

router.put('/:followId/accept', h(async (req, res) => res.json(await svc.accept(req.params.followId, req.user.id))));
router.put('/:followId/decline', h(async (req, res) => res.json(await svc.decline(req.params.followId, req.user.id))));

router.post('/block/:targetUserId', h(async (req, res) => res.json(await svc.block(req.user.id, req.params.targetUserId))));
router.delete('/block/:targetUserId', h(async (req, res) => res.json(await svc.unblock(req.user.id, req.params.targetUserId))));
router.delete('/followers/:userId', h(async (req, res) => res.json(await svc.removeFollower(req.user.id, req.params.userId))));

router.post('/:targetUserId', writeLimiter, requireProfile, h(async (req, res) => res.json(await svc.follow(req.user.id, req.params.targetUserId))));
router.delete('/:targetUserId', h(async (req, res) => res.json(await svc.unfollow(req.user.id, req.params.targetUserId))));

export default router;
