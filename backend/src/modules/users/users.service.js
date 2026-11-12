import { prisma } from '../../lib/prisma.js';
import { deleteImage, saveImage } from '../../lib/storage.js';
import { computeBirthChart } from '../../services/astrology/engine.js';
import { membershipStatus } from '../../services/membership.service.js';
import { unreadCounts } from '../../services/notification.service.js';
import { toProfileDetail } from '../../services/privacy.service.js';
import { MATRIMONY_REQUIRED } from './users.schema.js';
import { ApiError } from '../../utils/http.js';
import { normalizePhone } from '../../utils/format.js';


/** Everything the frontend needs about the logged-in user. */
export async function sessionUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { include: { photos: { orderBy: { sortOrder: 'asc' } }, familyContacts: { orderBy: { sortOrder: 'asc' } } } } },
  });
  if (!user) throw ApiError.notFound('User not found');
  const profile = user.profile ? toProfileDetail(user.profile, user, { isSelf: true, connected: true }) : null;
  if (profile) {
    profile.showPhone = user.profile.showPhone;
    profile.isActive = user.profile.isActive;
    profile.timeOfBirth = user.profile.timeOfBirth;
    profile.placeOfBirth = user.profile.placeOfBirth;
    profile.email = user.profile.email;
  }
  return {
    id: user.id,
    phone: user.phone,
    phoneVerified: user.isPhoneVerified,
    email: user.email,
    role: user.role,
    intents: user.intents,
    createdAt: user.createdAt,
    profile,
    membership: await membershipStatus(user.id, user.role),
    unread: await unreadCounts(user.id),
  };
}

/** Derives rashi / nakshatra when DOB is present (time of birth improves accuracy). */
function withAstrology(data, existing) {
  const dob = data.dateOfBirth ?? (existing?.dateOfBirth ? existing.dateOfBirth.toISOString().slice(0, 10) : null);
  const tob = data.timeOfBirth !== undefined ? data.timeOfBirth : existing?.timeOfBirth;
  if (!dob || (data.dateOfBirth === undefined && data.timeOfBirth === undefined)) return data;
  const chart = computeBirthChart(dob, tob || undefined);
  return { ...data, rashi: chart.rashi.name, nakshatra: chart.nakshatra.name };
}

function toDbData(input) {
  const data = { ...input };
  // degrees list ⇄ education summary (search, filters and cards keep using `education`)
  if (Array.isArray(data.degrees)) {
    data.degrees = data.degrees.filter((d) => d.degree?.trim()).map((d) => ({ degree: d.degree.trim(), institute: d.institute || null, year: d.year ?? null }));
    data.education = data.degrees.map((d) => d.degree).join(', ').slice(0, 120) || null;
  } else if (data.education) {
    data.degrees = [{ degree: data.education, institute: null, year: null }];
  }
  if (data.dateOfBirth) data.dateOfBirth = new Date(`${data.dateOfBirth}T00:00:00.000Z`);
  return data;
}

/** Replace the member's family contacts (max 4). Exactly one is marked primary. */
async function saveFamilyContacts(profileId, contacts) {
  if (contacts === undefined) return;
  const primaryIdx = Math.max(0, contacts.findIndex((c) => c.isPrimary));
  await prisma.$transaction([
    prisma.familyContact.deleteMany({ where: { profileId } }),
    prisma.familyContact.createMany({
      data: contacts.map((c, i) => ({ ...c, profileId, isPrimary: i === primaryIdx, sortOrder: i })),
    }),
  ]);
}

/** Matrimony needs date of birth, gender, education and occupation; community-only profiles don't. */
const matrimonyMissing = (p) => MATRIMONY_REQUIRED.filter(([k]) => !p?.[k]).map(([, label]) => label);
function assertMatrimonyReady(p) {
  if (!p?.isMatrimonial) return;
  const missing = matrimonyMissing(p);
  if (missing.length) throw new ApiError(400, 'MATRIMONY_DETAILS_REQUIRED', `To appear in matrimony, please add your ${missing.join(', ')}.`);
}

/**
 * Contact mobile number from the profile form → the account. A number verified by SMS login can't be
 * changed here. Each number can belong to one account only.
 */
async function savePhone(userId, raw, { required = false } = {}) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, isPhoneVerified: true } });
  if (raw === undefined) {
    if (required && !user.phone) throw new ApiError(400, 'PHONE_REQUIRED', 'Please add your mobile number');
    return;
  }
  if (user.isPhoneVerified) return;
  const phone = raw ? normalizePhone(raw) : null;
  if (raw && !phone) throw ApiError.badRequest('Enter a valid 10-digit mobile number');
  if (!phone && required) throw new ApiError(400, 'PHONE_REQUIRED', 'Please add your mobile number');
  if (phone === user.phone) return;
  try {
    await prisma.user.update({ where: { id: userId }, data: { phone } });
  } catch (err) {
    if (err.code === 'P2002') throw ApiError.conflict('This mobile number is already used by another account');
    throw err;
  }
}

export async function createProfile(userId, input) {
  const exists = await prisma.profile.findUnique({ where: { userId } });
  if (exists) throw ApiError.conflict('Profile already exists — use update instead');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { intents: true, email: true } });
  const { familyContacts, phone, ...rest } = input;
  await savePhone(userId, phone);
  if (!rest.email && user.email) rest.email = user.email; // the login email is the contact email by default
  const data = toDbData(withAstrology(rest));
  if (data.isMatrimonial === undefined) data.isMatrimonial = user.intents.includes('MATRIMONY') && !matrimonyMissing(data).length;
  assertMatrimonyReady(data);
  const profile = await prisma.profile.create({ data: { ...data, userId } });
  await saveFamilyContacts(profile.id, familyContacts);
  return sessionUser(userId);
}

export async function updateProfile(userId, input) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (!existing) throw ApiError.notFound('Create your profile first');
  const { familyContacts, phone, ...rest } = input;
  await savePhone(userId, phone);
  const data = toDbData(withAstrology(rest, existing));
  assertMatrimonyReady({ ...existing, ...data });
  await prisma.profile.update({ where: { userId }, data });
  await saveFamilyContacts(existing.id, familyContacts);
  return sessionUser(userId);
}

export async function setIntents(userId, intents) {
  await prisma.user.update({ where: { id: userId }, data: { intents } });
  // switch matrimony on only when the profile already has the matrimony details
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (intents.includes('MATRIMONY') && profile && !matrimonyMissing(profile).length) {
    await prisma.profile.update({ where: { userId }, data: { isMatrimonial: true } });
  }
  return sessionUser(userId);
}

async function syncPrimaryPhoto(profileId) {
  const first = await prisma.profilePhoto.findFirst({ where: { profileId }, orderBy: { sortOrder: 'asc' } });
  await prisma.profile.update({
    where: { id: profileId },
    data: { profilePhotoUrl: first?.url ?? null, profilePhotoBlurUrl: first?.blurUrl ?? null },
  });
}

export async function addPhotos(userId, files) {
  const profile = await prisma.profile.findUnique({ where: { userId }, include: { photos: true } });
  if (!profile) throw ApiError.notFound('Create your profile first');
  if (!files?.length) throw ApiError.badRequest('Please choose at least one photo');

  let order = profile.photos.reduce((m, p) => Math.max(m, p.sortOrder), -1);
  for (const file of files) {
    const saved = await saveImage(file, 'profiles');
    await prisma.profilePhoto.create({
      data: { profileId: profile.id, url: saved.url, blurUrl: saved.blurUrl, storageKey: saved.key, sortOrder: ++order },
    });
  }
  await syncPrimaryPhoto(profile.id);
  return sessionUser(userId);
}

export async function deletePhoto(userId, photoId) {
  const photo = await prisma.profilePhoto.findFirst({ where: { id: photoId, profile: { userId } } });
  if (!photo) throw ApiError.notFound('Photo not found');
  await prisma.profilePhoto.delete({ where: { id: photo.id } });
  await deleteImage(photo.storageKey);
  await syncPrimaryPhoto(photo.profileId);
  return sessionUser(userId);
}

export async function makePrimaryPhoto(userId, photoId) {
  const photo = await prisma.profilePhoto.findFirst({ where: { id: photoId, profile: { userId } } });
  if (!photo) throw ApiError.notFound('Photo not found');
  const min = await prisma.profilePhoto.findFirst({ where: { profileId: photo.profileId }, orderBy: { sortOrder: 'asc' } });
  await prisma.profilePhoto.update({ where: { id: photo.id }, data: { sortOrder: (min?.sortOrder ?? 0) - 1 } });
  await syncPrimaryPhoto(photo.profileId);
  return sessionUser(userId);
}

export async function myStats(userId) {
  const [followers, following, views, posts] = await Promise.all([
    prisma.follow.count({ where: { receiverId: userId, status: 'ACCEPTED' } }),
    prisma.follow.count({ where: { senderId: userId, status: 'ACCEPTED' } }),
    prisma.profileView.count({ where: { viewedId: userId } }),
    prisma.post.count({ where: { authorId: userId, isHidden: false } }),
  ]);
  return { followers, following, views, posts };
}

export async function deleteAccount(userId) {
  const photos = await prisma.profilePhoto.findMany({ where: { profile: { userId } }, select: { storageKey: true } });
  await prisma.user.delete({ where: { id: userId } });
  await Promise.all(photos.map((p) => deleteImage(p.storageKey)));
}

export { assertMatrimonyReady };
