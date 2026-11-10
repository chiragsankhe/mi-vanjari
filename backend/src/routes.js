import { Router } from 'express';
import achievers from './modules/achievers/achievers.routes.js';
import admin from './modules/admin/admin.routes.js';
import astrology from './modules/astrology/astrology.routes.js';
import auth from './modules/auth/auth.routes.js';
import business from './modules/business/business.routes.js';
import chat from './modules/chat/chat.routes.js';
import community from './modules/community/community.routes.js';
import history from './modules/history/history.routes.js';
import follow from './modules/follow/follow.routes.js';
import matrimonial from './modules/matrimonial/matrimonial.routes.js';
import notifications from './modules/notifications/notifications.routes.js';
import payments from './modules/payments/payments.routes.js';
import services from './modules/services/services.routes.js';
import users from './modules/users/users.routes.js';

/**
 * API v1 route map. To add a feature: create src/modules/<name>/<name>.routes.js and mount it here.
 */
const api = Router();

// `ip` is the caller's own address as the server sees it — used to check TRUST_PROXY after deploying
api.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString(), ip: req.ip }));

api.use('/auth', auth);
api.use('/users', users);
api.use('/matrimonial', matrimonial);
api.use('/follow', follow);
api.use('/chat', chat);
api.use('/notifications', notifications);
api.use('/services', services);
api.use('/business', business);
api.use('/achievers', achievers);
api.use('/astrology', astrology);
api.use('/community', community);
api.use('/history', history);
api.use('/payments', payments);
api.use('/admin', admin);

export default api;
