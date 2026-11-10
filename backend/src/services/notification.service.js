import { prisma } from '../lib/prisma.js';
import { emitToUser } from '../sockets/io.js';

/**
 * Create a notification and push it in real time.
 * @param {{ userId: string, type: import('@prisma/client').NotificationType, content: string, fromUserId?: string, link?: string }} n
 */
export async function notify({ userId, type, content, fromUserId = null, link = null }) {
  if (!userId || userId === fromUserId) return null;
  const notification = await prisma.notification.create({ data: { userId, type, content, fromUserId, link } });
  emitToUser(userId, 'notification', notification);
  return notification;
}

export async function unreadCounts(userId) {
  const [notifications, messages, requests] = await Promise.all([
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.message.count({ where: { receiverId: userId, isRead: false } }),
    prisma.follow.count({ where: { receiverId: userId, status: 'PENDING' } }),
  ]);
  return { notifications, messages, requests };
}
