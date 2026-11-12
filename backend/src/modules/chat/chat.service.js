import { prisma } from '../../lib/prisma.js';
import { notify } from '../../services/notification.service.js';
import { getBlockedIds, getRelationship } from '../../services/privacy.service.js';
import { emitToUser, isOnline } from '../../sockets/io.js';
import { ApiError } from '../../utils/http.js';

const MAX_LEN = 2000;
const pair = (a, b) => (a < b ? [a, b] : [b, a]);

/**
 * Chat permission. Blocks always win. Otherwise either:
 *  • an ACCEPTED follow in either direction (member-to-member, incl. matrimony), or
 *  • an enquiry conversation — started from the other person's business / wedding-service listing.
 */
/** Sample profiles (added by the admin to show how the site looks) are not real people — nobody can message them. */
export async function assertNotSample(userId) {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { isDemo: true } });
  if (p?.isDemo) throw ApiError.forbidden('This is a sample profile, shown to illustrate the site. It is not a real member.', 'SAMPLE_PROFILE');
}

export async function assertCanChat(senderId, receiverId) {
  if (senderId === receiverId) throw ApiError.badRequest('Invalid recipient');
  await assertNotSample(receiverId);
  const rel = await getRelationship(senderId, receiverId);
  if (rel.blocked) throw ApiError.forbidden('You cannot message this member', 'BLOCKED');
  if (rel.connected) return;
  const [participant1Id, participant2Id] = pair(senderId, receiverId);
  const convo = await prisma.conversation.findUnique({ where: { participant1Id_participant2Id: { participant1Id, participant2Id } }, select: { enquiry: true } });
  if (!convo?.enquiry) throw ApiError.forbidden('You must be connected (an accepted follow) to chat', 'FOLLOW_REQUIRED');
}

const contextOf = (c) => (c.contextType ? { type: c.contextType, id: c.contextId, title: c.contextTitle } : null);

/**
 * Chat with the owner of a business or wedding-service listing (no follow needed).
 * Marks the conversation as an enquiry and remembers which listing it is about.
 */
export async function openListingChat(userId, type, listingId) {
  const listing =
    type === 'BUSINESS'
      ? await prisma.business.findFirst({ where: { id: listingId, isActive: true, status: 'APPROVED' }, select: { userId: true, name: true } })
      : await prisma.serviceProvider.findFirst({ where: { id: listingId, isActive: true, status: 'APPROVED' }, select: { userId: true, businessName: true } });
  if (!listing) throw ApiError.notFound('Listing not available');
  if (listing.userId === userId) throw ApiError.badRequest('This is your own listing');
  await assertNotSample(listing.userId);
  const rel = await getRelationship(userId, listing.userId);
  if (rel.blocked) throw ApiError.forbidden('You cannot message this member', 'BLOCKED');
  const [participant1Id, participant2Id] = pair(userId, listing.userId);
  const context = { enquiry: true, contextType: type, contextId: listingId, contextTitle: listing.name || listing.businessName };
  const convo = await prisma.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id, participant2Id } },
    create: { participant1Id, participant2Id, ...context },
    update: context,
  });
  return { id: convo.id, partner: await partnerSummary(listing.userId), context: contextOf(convo) };
}

async function partnerSummary(userId) {
  const p = await prisma.profile.findUnique({
    where: { userId },
    select: { userId: true, fullName: true, profilePhotoUrl: true, isVerified: true, currentCity: true },
  });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { lastActiveAt: true } });
  return p ? { ...p, lastActiveAt: u?.lastActiveAt, online: isOnline(userId) } : null;
}

export async function getOrCreateConversation(a, b) {
  const [participant1Id, participant2Id] = pair(a, b);
  return prisma.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id, participant2Id } },
    create: { participant1Id, participant2Id },
    update: {},
  });
}

async function assertParticipant(conversationId, userId) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo || (convo.participant1Id !== userId && convo.participant2Id !== userId)) throw ApiError.notFound('Conversation not found');
  return convo;
}

export async function listConversations(userId) {
  const convos = await prisma.conversation.findMany({
    where: { OR: [{ participant1Id: userId }, { participant2Id: userId }], messages: { some: {} } },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  const unread = await prisma.message.groupBy({ by: ['conversationId'], where: { receiverId: userId, isRead: false }, _count: true });
  const unreadMap = new Map(unread.map((u) => [u.conversationId, u._count]));
  const blocked = new Set(await getBlockedIds(userId));

  return Promise.all(
    convos
      .filter((c) => !blocked.has(c.participant1Id === userId ? c.participant2Id : c.participant1Id))
      .map(async (c) => {
      const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
      return {
        id: c.id,
        partner: await partnerSummary(otherId),
        lastMessage: c.messages[0] || null,
        context: contextOf(c),
        unread: unreadMap.get(c.id) || 0,
        lastMessageAt: c.lastMessageAt,
      };
    }),
  ).then((rows) => rows.filter((r) => r.partner));
}

/** Open (or prepare) a conversation with a member — used before the first message. */
export async function openWith(userId, otherId) {
  await assertCanChat(userId, otherId);
  const convo = await getOrCreateConversation(userId, otherId);
  return { id: convo.id, partner: await partnerSummary(otherId) };
}

export async function getConversation(conversationId, userId) {
  const c = await assertParticipant(conversationId, userId);
  const otherId = c.participant1Id === userId ? c.participant2Id : c.participant1Id;
  const rel = await getRelationship(userId, otherId);
  return { id: c.id, partner: await partnerSummary(otherId), canMessage: (rel.connected || c.enquiry) && !rel.blocked, context: contextOf(c) };
}

/** Cursor-paginated messages, newest page first (returned oldest→newest for rendering). */
export async function messages(conversationId, userId, { before, limit = 30 }) {
  await assertParticipant(conversationId, userId);
  const take = Math.min(Number(limit) || 30, 100);
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(before && { createdAt: { lt: new Date(before) } }) },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
  });
  const hasMore = rows.length > take;
  const items = rows.slice(0, take).reverse();
  return { items, hasMore, nextCursor: hasMore ? items[0].createdAt : null };
}

/** Persist and deliver a message (shared by REST and Socket.io). */
/**
 * Per-member message limit, shared by the live socket and the REST fallback (the REST route also has a
 * per-IP limit). Stops spam bursts: at most 10 messages in 10 seconds and 60 in a minute.
 */
const RATE = [
  [10_000, 10],
  [60_000, 60],
];
const sentAt = new Map(); // userId → recent send times (ms)
function checkMessageRate(userId) {
  const now = Date.now();
  const recent = (sentAt.get(userId) || []).filter((t) => now - t < 60_000);
  for (const [windowMs, max] of RATE) {
    if (recent.filter((t) => now - t < windowMs).length >= max) {
      throw new ApiError(429, 'RATE_LIMITED', 'You are sending messages too fast. Please wait a moment and try again.');
    }
  }
  recent.push(now);
  sentAt.set(userId, recent);
}
// forget idle members so the map never grows without limit
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [id, times] of sentAt) if (!times.some((t) => t > cutoff)) sentAt.delete(id);
}, 5 * 60_000).unref();

export async function sendMessage(senderId, receiverId, rawContent) {
  checkMessageRate(senderId);
  const content = String(rawContent || '').trim();
  if (!content) throw ApiError.badRequest('Message cannot be empty');
  if (content.length > MAX_LEN) throw ApiError.badRequest(`Message is too long (max ${MAX_LEN} characters)`);
  await assertCanChat(senderId, receiverId);

  const convo = await getOrCreateConversation(senderId, receiverId);
  const [message] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId: convo.id, senderId, receiverId, content } }),
    prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date() } }),
  ]);

  emitToUser(receiverId, 'new_message', message);
  emitToUser(senderId, 'new_message', message);

  // Notify only if the receiver is offline (avoid notification spam during live chats)
  if (!isOnline(receiverId)) {
    const sender = await prisma.profile.findUnique({ where: { userId: senderId }, select: { fullName: true } });
    await notify({
      userId: receiverId,
      type: 'MESSAGE',
      content: `New message from ${sender?.fullName || 'a member'}`,
      fromUserId: senderId,
      link: `/messages/${convo.id}`,
    });
  }
  return message;
}

export async function markRead(conversationId, userId) {
  const convo = await assertParticipant(conversationId, userId);
  const { count } = await prisma.message.updateMany({ where: { conversationId, receiverId: userId, isRead: false }, data: { isRead: true } });
  if (count) {
    const otherId = convo.participant1Id === userId ? convo.participant2Id : convo.participant1Id;
    emitToUser(otherId, 'message_read', { conversationId, readerId: userId });
  }
  return { updated: count };
}

export { assertParticipant };
