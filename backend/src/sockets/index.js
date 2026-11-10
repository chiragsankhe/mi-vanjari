import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { assertParticipant, markRead, sendMessage } from '../modules/chat/chat.service.js';
import { emitToUser, setIO } from './io.js';

/**
 * Socket.io real-time layer.
 *
 * CLIENT → SERVER: join_room {conversationId} · leave_room · send_message {receiverId, content, tempId}
 *                  typing {conversationId, isTyping} · mark_read {conversationId}
 * SERVER → CLIENT: new_message · message_read · typing_indicator · notification
 *                  follow_request · follow_accepted · presence {userId, online} · app_error {code, message}
 */
/** Tell only this user's chat partners about presence changes (not the whole server). */
async function announcePresence(userId, online) {
  try {
    const convos = await prisma.conversation.findMany({
      where: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
      select: { participant1Id: true, participant2Id: true },
      orderBy: { lastMessageAt: 'desc' },
      take: 200,
    });
    for (const c of convos) emitToUser(c.participant1Id === userId ? c.participant2Id : c.participant1Id, 'presence', { userId, online });
  } catch {
    /* non-critical */
  }
}

export function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: (origin, cb) => cb(null, env.isAllowedOrigin(origin)), credentials: true },
    pingInterval: 25_000,
  });
  setIO(io);

  // Authenticate every connection with the access token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isBanned: true } });
      if (!user || user.isBanned) return next(new Error('UNAUTHORIZED'));
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(`user:${userId}`);
    prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }).catch(() => {});
    announcePresence(userId, true);

    const fail = (err, ack) => {
      const payload = { code: err.code || 'ERROR', message: err.message || 'Something went wrong' };
      if (typeof ack === 'function') ack({ ok: false, error: payload });
      else socket.emit('app_error', payload);
    };

    socket.on('join_room', async ({ conversationId } = {}, ack) => {
      try {
        await assertParticipant(conversationId, userId);
        socket.join(`conv:${conversationId}`);
        ack?.({ ok: true });
      } catch (err) {
        fail(err, ack);
      }
    });

    socket.on('leave_room', ({ conversationId } = {}) => socket.leave(`conv:${conversationId}`));

    socket.on('send_message', async ({ receiverId, content, tempId } = {}, ack) => {
      try {
        const message = await sendMessage(userId, receiverId, content);
        ack?.({ ok: true, message, tempId });
      } catch (err) {
        fail(err, ack);
      }
    });

    socket.on('typing', ({ conversationId, isTyping } = {}) => {
      if (conversationId) socket.to(`conv:${conversationId}`).emit('typing_indicator', { conversationId, userId, isTyping: Boolean(isTyping) });
    });

    socket.on('mark_read', async ({ conversationId } = {}) => {
      try {
        await markRead(conversationId, userId);
      } catch (err) {
        fail(err);
      }
    });

    socket.on('disconnect', () => {
      const room = io.sockets.adapter.rooms.get(`user:${userId}`);
      if (!room || room.size === 0) {
        announcePresence(userId, false);
        prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } }).catch(() => {});
      }
    });
  });

  logger.info('🔌 Socket.io ready');
  return io;
}
