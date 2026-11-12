import { prisma } from '../../lib/prisma.js';
import { notify } from '../../services/notification.service.js';
import { getRelationship, followStatusOf } from '../../services/privacy.service.js';
import { emitToUser } from '../../sockets/io.js';
import { ApiError, pageResult, paginate } from '../../utils/http.js';
import { toCards } from '../matrimonial/matrimonial.service.js';

const nameOf = async (userId) => (await prisma.profile.findUnique({ where: { userId }, select: { fullName: true } }))?.fullName || 'A member';

/** Brief user summary used in socket payloads and lists. */
async function miniUser(userId) {
  const p = await prisma.profile.findUnique({
    where: { userId },
    select: { userId: true, fullName: true, profilePhotoUrl: true, currentCity: true, isVerified: true },
  });
  return p;
}

/**
 * Send a follow request. Public accounts accept automatically (Instagram-style);
 * private accounts receive a pending request.
 */
export async function follow(senderId, receiverId) {
  if (senderId === receiverId) throw ApiError.badRequest('You cannot follow yourself');
  const target = await prisma.profile.findUnique({ where: { userId: receiverId } });
  if (!target) throw ApiError.notFound('Member not found');
  if (target.isDemo) throw ApiError.forbidden('This is a sample profile, shown to illustrate the site. It is not a real member.', 'SAMPLE_PROFILE');

  const rel = await getRelationship(senderId, receiverId);
  if (rel.blocked) throw ApiError.forbidden('You cannot follow this member');
  if (rel.outgoing && ['PENDING', 'ACCEPTED'].includes(rel.outgoing.status)) return { status: rel.outgoing.status, followId: rel.outgoing.id };

  const status = target.accountType === 'PUBLIC' ? 'ACCEPTED' : 'PENDING';
  // The receiver already follows the sender → this is a follow-back: both have chosen each other.
  const followBack = rel.incoming?.status === 'ACCEPTED';
  const row = await prisma.follow.upsert({
    where: { senderId_receiverId: { senderId, receiverId } },
    create: { senderId, receiverId, status, approvedByOwner: followBack && status === 'ACCEPTED' },
    update: { status, approvedByOwner: followBack && status === 'ACCEPTED' },
  });
  if (followBack) await prisma.follow.update({ where: { id: rel.incoming.id }, data: { approvedByOwner: true } });

  const from = await miniUser(senderId);
  const senderName = from?.fullName || 'A member';
  if (status === 'PENDING') {
    await notify({ userId: receiverId, type: 'FOLLOW_REQUEST', content: `${senderName} sent you a follow request`, fromUserId: senderId, link: '/requests' });
    emitToUser(receiverId, 'follow_request', { followId: row.id, from });
  } else {
    await notify({ userId: receiverId, type: 'FOLLOW_ACCEPTED', content: `${senderName} started following you`, fromUserId: senderId, link: `/profile/${senderId}` });
  }
  return { status, followId: row.id };
}

async function ownRequest(followId, receiverId) {
  const row = await prisma.follow.findUnique({ where: { id: followId } });
  if (!row || row.receiverId !== receiverId) throw ApiError.notFound('Request not found');
  if (row.status !== 'PENDING') throw ApiError.badRequest('This request was already handled');
  return row;
}

export async function accept(followId, userId) {
  const row = await ownRequest(followId, userId);
  await prisma.follow.update({ where: { id: row.id }, data: { status: 'ACCEPTED', approvedByOwner: true } });
  const by = await miniUser(userId);
  await notify({
    userId: row.senderId,
    type: 'FOLLOW_ACCEPTED',
    content: `${by?.fullName || 'A member'} accepted your follow request`,
    fromUserId: userId,
    link: `/profile/${userId}`,
  });
  emitToUser(row.senderId, 'follow_accepted', { by });
  return { status: 'ACCEPTED' };
}

export async function decline(followId, userId) {
  const row = await ownRequest(followId, userId);
  await prisma.follow.update({ where: { id: row.id }, data: { status: 'DECLINED' } });
  return { status: 'DECLINED' };
}

/** Unfollow / cancel a pending request. */
export async function unfollow(senderId, receiverId) {
  await prisma.follow.deleteMany({ where: { senderId, receiverId, status: { in: ['PENDING', 'ACCEPTED', 'DECLINED'] } } });
  return { status: 'NONE' };
}

/** Remove someone who follows me. */
export async function removeFollower(userId, followerId) {
  await prisma.follow.deleteMany({ where: { senderId: followerId, receiverId: userId, status: { not: 'BLOCKED' } } });
  return { ok: true };
}

export async function status(viewerId, targetId) {
  const rel = await getRelationship(viewerId, targetId);
  return {
    status: followStatusOf(rel),
    incoming: rel.incoming?.status ?? 'NONE',
    connected: rel.connected,
    blockedByMe: rel.outgoing?.status === 'BLOCKED',
  };
}

export async function block(userId, targetId) {
  if (userId === targetId) throw ApiError.badRequest('Invalid');
  await prisma.$transaction([
    prisma.follow.deleteMany({ where: { senderId: targetId, receiverId: userId, status: { not: 'BLOCKED' } } }),
    prisma.follow.upsert({
      where: { senderId_receiverId: { senderId: userId, receiverId: targetId } },
      create: { senderId: userId, receiverId: targetId, status: 'BLOCKED' },
      update: { status: 'BLOCKED' },
    }),
    prisma.shortlist.deleteMany({ where: { OR: [{ userId, targetUserId: targetId }, { userId: targetId, targetUserId: userId }] } }),
  ]);
  return { blocked: true };
}

export async function unblock(userId, targetId) {
  await prisma.follow.deleteMany({ where: { senderId: userId, receiverId: targetId, status: 'BLOCKED' } });
  return { blocked: false };
}

/** Pending requests I received. */
export async function receivedRequests(userId, q) {
  const { page, limit, skip, take } = paginate(q, { defaultLimit: 20 });
  const where = { receiverId: userId, status: 'PENDING' };
  const [rows, total] = await Promise.all([
    prisma.follow.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { sender: { include: { profile: true } } } }),
    prisma.follow.count({ where }),
  ]);
  const cards = await toCards(userId, rows.map((r) => r.sender.profile).filter(Boolean));
  return pageResult(
    rows.filter((r) => r.sender.profile).map((r, i) => ({ followId: r.id, createdAt: r.createdAt, user: cards[i] })),
    total,
    { page, limit },
  );
}

/** Requests I sent that are still pending. */
export async function sentRequests(userId, q) {
  const { page, limit, skip, take } = paginate(q, { defaultLimit: 20 });
  const where = { senderId: userId, status: 'PENDING' };
  const [rows, total] = await Promise.all([
    prisma.follow.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { receiver: { include: { profile: true } } } }),
    prisma.follow.count({ where }),
  ]);
  const cards = await toCards(userId, rows.map((r) => r.receiver.profile).filter(Boolean));
  return pageResult(
    rows.filter((r) => r.receiver.profile).map((r, i) => ({ followId: r.id, createdAt: r.createdAt, user: cards[i] })),
    total,
    { page, limit },
  );
}

export async function list(userId, kind, q) {
  const { page, limit, skip, take } = paginate(q, { defaultLimit: 20 });
  const where = kind === 'followers' ? { receiverId: userId, status: 'ACCEPTED' } : { senderId: userId, status: 'ACCEPTED' };
  const include = kind === 'followers' ? { sender: { include: { profile: true } } } : { receiver: { include: { profile: true } } };
  const [rows, total] = await Promise.all([
    prisma.follow.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take, include }),
    prisma.follow.count({ where }),
  ]);
  const profiles = rows.map((r) => (kind === 'followers' ? r.sender.profile : r.receiver.profile)).filter(Boolean);
  return pageResult(await toCards(userId, profiles), total, { page, limit });
}

export async function blockedList(userId) {
  const rows = await prisma.follow.findMany({
    where: { senderId: userId, status: 'BLOCKED' },
    include: { receiver: { include: { profile: { select: { fullName: true, profilePhotoUrl: true } } } } },
  });
  return rows.map((r) => ({ userId: r.receiverId, fullName: r.receiver.profile?.fullName, photoUrl: r.receiver.profile?.profilePhotoUrl }));
}

export { nameOf };
