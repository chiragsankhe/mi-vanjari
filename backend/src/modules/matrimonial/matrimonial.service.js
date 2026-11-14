import { prisma } from '../../lib/prisma.js';
import { notify } from '../../services/notification.service.js';
import { chartFromNames, gunaMilan } from '../../services/astrology/engine.js';
import {
  canViewFull,
  computeMatchScore,
  followStatusOf,
  getBlockedIds,
  toProfileCard,
  toProfileDetail,
} from '../../services/privacy.service.js';
import { ApiError, pageResult, paginate } from '../../utils/http.js';
import { hasMatrimonyAccess, listedOwnerFilter, membershipStatus } from '../../services/membership.service.js';

const EDUCATION_KEYWORDS = {
  GRADUATE: ['B.', 'BA', 'BSc', 'B.Sc', 'BCom', 'B.Com', 'BE', 'B.E', 'BTech', 'B.Tech', 'Graduate', 'BBA', 'BCA'],
  MASTERS: ['M.', 'MA', 'MSc', 'M.Sc', 'MCom', 'MBA', 'MTech', 'M.Tech', 'Masters', 'MCA', 'PhD'],
  PROFESSIONAL: ['Engineer', 'Doctor', 'MBBS', 'BDS', 'CA', 'Lawyer', 'LLB', 'Architect', 'MD', 'Dentist'],
};

function dobBoundsForAge(ageMin, ageMax) {
  const now = new Date();
  const where = {};
  if (ageMin) where.lte = new Date(Date.UTC(now.getUTCFullYear() - ageMin, now.getUTCMonth(), now.getUTCDate()));
  if (ageMax) where.gt = new Date(Date.UTC(now.getUTCFullYear() - ageMax - 1, now.getUTCMonth(), now.getUTCDate()));
  return where;
}

function gunaFor(viewerProfile, candidate) {
  if (!viewerProfile?.rashi || !candidate.rashi || viewerProfile.gender === candidate.gender) return null;
  const a = chartFromNames(viewerProfile.rashi, viewerProfile.nakshatra);
  const b = chartFromNames(candidate.rashi, candidate.nakshatra);
  if (!a || !b) return null;
  const [boy, girl] = viewerProfile.gender === 'MALE' ? [a, b] : [b, a];
  return gunaMilan(boy, girl).total;
}

/** Decorate a list of profiles for a viewer (follow status, privacy, score, shortlist). */
async function toCards(viewerId, profiles) {
  if (!profiles.length) return [];
  const ids = profiles.map((p) => p.userId);
  const [viewerProfile, outgoing, incoming, shortlisted] = await Promise.all([
    viewerId ? prisma.profile.findUnique({ where: { userId: viewerId } }) : null,
    viewerId ? prisma.follow.findMany({ where: { senderId: viewerId, receiverId: { in: ids } } }) : [],
    viewerId ? prisma.follow.findMany({ where: { receiverId: viewerId, senderId: { in: ids } } }) : [],
    viewerId ? prisma.shortlist.findMany({ where: { userId: viewerId, targetUserId: { in: ids } } }) : [],
  ]);
  const outMap = new Map(outgoing.map((f) => [f.receiverId, f]));
  const inMap = new Map(incoming.map((f) => [f.senderId, f]));
  const shortSet = new Set(shortlisted.map((s) => s.targetUserId));

  return profiles.map((p) => {
    const out = outMap.get(p.userId) || null;
    const inc = inMap.get(p.userId) || null;
    const rel = {
      isSelf: p.userId === viewerId,
      outgoing: out,
      incoming: inc,
      blocked: false,
      connected: out?.status === 'ACCEPTED' || inc?.status === 'ACCEPTED',
    };
    return toProfileCard(p, {
      full: canViewFull(p, rel),
      followStatus: followStatusOf(rel),
      matchScore: viewerProfile && !rel.isSelf ? computeMatchScore(viewerProfile, p, gunaFor(viewerProfile, p)) : null,
      shortlisted: shortSet.has(p.userId),
    });
  });
}

export async function browse(viewerId, q) {
  const { page, limit, skip, take } = paginate(q, { defaultLimit: 12 });
  const viewer = await prisma.profile.findUnique({ where: { userId: viewerId } });
  const blocked = await getBlockedIds(viewerId);

  let gender = q.gender;
  if (!gender && viewer) gender = viewer.gender === 'MALE' ? 'FEMALE' : viewer.gender === 'FEMALE' ? 'MALE' : undefined;

  const and = [];
  if (q.q) {
    and.push({
      OR: [
        { fullName: { contains: q.q, mode: 'insensitive' } },
        { currentCity: { contains: q.q, mode: 'insensitive' } },
        { occupation: { contains: q.q, mode: 'insensitive' } },
        { education: { contains: q.q, mode: 'insensitive' } },
        { gotra: { contains: q.q, mode: 'insensitive' } },
      ],
    });
  }
  if (q.education && EDUCATION_KEYWORDS[q.education]) {
    and.push({ OR: EDUCATION_KEYWORDS[q.education].map((k) => ({ education: { contains: k, mode: 'insensitive' } })) });
  }

  const where = {
    isMatrimonial: true,
    isActive: true,
    userId: { notIn: [viewerId, ...blocked] },
    user: { isBanned: false, ...(await listedOwnerFilter()) },
    ...(gender && { gender }),
    ...(q.city && { OR: [{ currentCity: { contains: q.city, mode: 'insensitive' } }, { currentState: { contains: q.city, mode: 'insensitive' } }] }),
    // Married members are not looking for a partner: they never appear in Matches (they stay in the Community directory)
    maritalStatus: q.maritalStatus && q.maritalStatus !== 'MARRIED' ? q.maritalStatus : { not: 'MARRIED' },
    ...(q.verified === 'true' && { isVerified: true }),
    ...((q.ageMin || q.ageMax) && { dateOfBirth: dobBoundsForAge(Number(q.ageMin) || null, Number(q.ageMax) || null) }),
    // Height (cm). Profiles without a height are left out once a height range is chosen.
    ...((q.heightMin || q.heightMax) && {
      heightCm: { ...(q.heightMin && { gte: Number(q.heightMin) }), ...(q.heightMax && { lte: Number(q.heightMax) }) },
    }),
    ...(and.length && { AND: and }),
  };

  const orderBy = q.sort === 'newest' ? [{ createdAt: 'desc' }] : [{ user: { lastActiveAt: { sort: 'desc', nulls: 'last' } } }, { createdAt: 'desc' }];

  const [rows, total] = await Promise.all([prisma.profile.findMany({ where, orderBy, skip, take }), prisma.profile.count({ where })]);
  return pageResult(await toCards(viewerId, rows), total, { page, limit });
}

/** Public showcase for the landing page — only public, verified, matrimonial profiles. */
export async function featured(viewerId) {
  const rows = await prisma.profile.findMany({
    where: { isMatrimonial: true, isActive: true, maritalStatus: { not: 'MARRIED' }, accountType: 'PUBLIC', isVerified: true, profilePhotoUrl: { not: null }, user: { isBanned: false, ...(await listedOwnerFilter()) } },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  });
  const cards = await toCards(viewerId, rows);
  // anonymous visitors get a softer default score
  return cards.map((c, i) => ({ ...c, matchScore: c.matchScore ?? 92 - i * 3 }));
}

export async function detail(viewer, targetUserId, rel) {
  const viewerId = viewer?.id;
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { profile: { include: { photos: { orderBy: { sortOrder: 'asc' } }, familyContacts: { orderBy: { sortOrder: 'asc' } } } } },
  });
  if (!user?.profile || user.isBanned || (!user.profile.isActive && !rel.isSelf)) throw ApiError.notFound('Profile not available');

  const viewerProfile = viewerId && !rel.isSelf ? await prisma.profile.findUnique({ where: { userId: viewerId } }) : null;
  const guna = viewerProfile ? gunaFor(viewerProfile, user.profile) : null;
  const shortlisted = viewerId ? Boolean(await prisma.shortlist.findUnique({ where: { userId_targetUserId: { userId: viewerId, targetUserId } } })) : false;

  if (viewerId && !rel.isSelf) {
    await prisma.profileView.upsert({
      where: { viewerId_viewedId: { viewerId, viewedId: targetUserId } },
      create: { viewerId, viewedId: targetUserId },
      update: { viewedAt: new Date() },
    });
  }

  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { receiverId: targetUserId, status: 'ACCEPTED' } }),
    prisma.follow.count({ where: { senderId: targetUserId, status: 'ACCEPTED' } }),
  ]);

  const doc = {
    ...toProfileDetail(user.profile, user, rel, {
      matchScore: viewerProfile ? computeMatchScore(viewerProfile, user.profile, guna) : null,
      shortlisted,
    }),
    gunaScore: canViewFull(user.profile, rel) ? guna : null,
    stats: { followers, following },
    familyContactRequested: await familyContactRequested(viewerId, targetUserId),
  };

  // Paywall: without a matrimony membership the community profile stays visible,
  // but matrimony details (family contacts, preferences, match & Kundali) are withheld.
  if (user.profile.isMatrimonial && !rel.isSelf && !(await hasMatrimonyAccess(viewer))) {
    const { fee } = await membershipStatus(viewer.id, viewer.role);
    Object.assign(doc, { matrimonyLocked: true, membershipFee: fee, familyContacts: [], familyContactCount: doc.familyContacts?.length || doc.familyContactCount || 0, matchScore: null, gunaScore: null, prefAgeMin: null, prefAgeMax: null, prefEducation: null, prefLocation: null, prefOccupation: null, prefName: null });
  }
  return doc;
}

/** Full Guna Milan breakdown between viewer and target (only with full access). */
export async function kundali(viewerId, targetUserId, rel) {
  const [me, them] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: viewerId } }),
    prisma.profile.findUnique({ where: { userId: targetUserId } }),
  ]);
  if (!me || !them) throw ApiError.notFound('Profile not found');
  if (!canViewFull(them, rel)) throw ApiError.forbidden('Follow this profile to view Kundali compatibility', 'FOLLOW_REQUIRED');
  if (!me.rashi || !me.nakshatra) throw ApiError.badRequest('Add your date and time of birth in your profile to see Kundali matching', 'BIRTH_DETAILS_REQUIRED');
  if (!them.rashi || !them.nakshatra) throw ApiError.badRequest('This member has not added birth details yet');
  const a = chartFromNames(me.rashi, me.nakshatra);
  const b = chartFromNames(them.rashi, them.nakshatra);
  const [boy, girl] = me.gender === 'MALE' ? [a, b] : [b, a];
  return { ...gunaMilan(boy, girl), boyName: me.gender === 'MALE' ? me.fullName : them.fullName, girlName: me.gender === 'MALE' ? them.fullName : me.fullName };
}

export async function toggleShortlist(userId, targetUserId) {
  if (userId === targetUserId) throw ApiError.badRequest('You cannot shortlist yourself');
  const key = { userId_targetUserId: { userId, targetUserId } };
  const existing = await prisma.shortlist.findUnique({ where: key });
  if (existing) {
    await prisma.shortlist.delete({ where: key });
    return { shortlisted: false };
  }
  await prisma.shortlist.create({ data: { userId, targetUserId } });
  return { shortlisted: true };
}

export async function shortlist(userId, q) {
  const { page, limit, skip, take } = paginate(q);
  const where = { userId, target: { profile: { isActive: true } } };
  const [rows, total] = await Promise.all([
    prisma.shortlist.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { target: { include: { profile: true } } } }),
    prisma.shortlist.count({ where }),
  ]);
  return pageResult(await toCards(userId, rows.map((r) => r.target.profile).filter(Boolean)), total, { page, limit });
}

export async function viewers(userId, q) {
  const { page, limit, skip, take } = paginate(q);
  const where = { viewedId: userId };
  const [rows, total] = await Promise.all([
    prisma.profileView.findMany({ where, orderBy: { viewedAt: 'desc' }, skip, take, include: { viewer: { include: { profile: true } } } }),
    prisma.profileView.count({ where }),
  ]);
  const cards = await toCards(userId, rows.map((r) => r.viewer.profile).filter(Boolean));
  return pageResult(
    cards.map((c) => ({ ...c, viewedAt: rows.find((r) => r.viewerId === c.userId)?.viewedAt })),
    total,
    { page, limit },
  );
}

export { toCards };

const FAMILY_REQUEST_LINK = '/me/edit?section=family';
const WEEK = 7 * 86400_000;

/** Has this viewer already asked this member for family contacts in the last 7 days? */
export async function familyContactRequested(viewerId, targetUserId) {
  if (!viewerId) return false;
  return Boolean(
    await prisma.notification.findFirst({ where: { userId: targetUserId, fromUserId: viewerId, link: FAMILY_REQUEST_LINK, createdAt: { gt: new Date(Date.now() - WEEK) } }, select: { id: true } }),
  );
}

/** Ask a member to add family contact numbers (one request per viewer per week). */
export async function requestFamilyContact(viewerId, targetUserId) {
  if (viewerId === targetUserId) throw ApiError.badRequest('This is your own profile');
  const target = await prisma.profile.findUnique({ where: { userId: targetUserId }, select: { isActive: true, isDemo: true, _count: { select: { familyContacts: true } } } });
  if (!target?.isActive) throw ApiError.notFound('Profile not available');
  if (target.isDemo) throw ApiError.forbidden('This is a sample profile, shown to illustrate the site. It is not a real member.', 'SAMPLE_PROFILE');
  if (target._count.familyContacts) throw ApiError.badRequest('This member has already added family contacts');
  if (await familyContactRequested(viewerId, targetUserId)) return { requested: true, already: true };
  const me = await prisma.profile.findUnique({ where: { userId: viewerId }, select: { fullName: true } });
  await notify({
    userId: targetUserId,
    type: 'SYSTEM',
    content: `${me?.fullName || 'A member'} would like to speak to your family. Add a family contact (father, mother, brother…) to your profile so families can call.`,
    fromUserId: viewerId,
    link: FAMILY_REQUEST_LINK,
  });
  return { requested: true };
}
