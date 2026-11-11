import { prisma } from '../lib/prisma.js';
import { ageFromDob, formatPhone, maskPhone, toDateString } from '../utils/format.js';

/**
 * Privacy rules (single source of truth):
 *  - PUBLIC account                       → full profile (phone still hidden until an accepted follow)
 *  - PRIVATE account + accepted follow    → full profile
 *  - PRIVATE account otherwise            → locked card: first name, age range, city, gotra, blurred photo
 *  - Either side has BLOCKED the other    → profile is invisible
 *  - Phone number is revealed only to accepted followers and only if the owner enabled `showPhone`
 */

/** Returns the follow relationship between viewer and target in both directions. */
export async function getRelationship(viewerId, targetId) {
  if (!viewerId) return { outgoing: null, incoming: null, isSelf: false, blocked: false, connected: false };
  if (viewerId === targetId) return { outgoing: null, incoming: null, isSelf: true, blocked: false, connected: true };

  const follows = await prisma.follow.findMany({
    where: {
      OR: [
        { senderId: viewerId, receiverId: targetId },
        { senderId: targetId, receiverId: viewerId },
      ],
    },
  });
  const outgoing = follows.find((f) => f.senderId === viewerId) || null;
  const incoming = follows.find((f) => f.senderId === targetId) || null;
  const blocked = follows.some((f) => f.status === 'BLOCKED');
  const connected = outgoing?.status === 'ACCEPTED' || incoming?.status === 'ACCEPTED';
  return { outgoing, incoming, isSelf: false, blocked, connected };
}

/** Viewer may see full details? */
export function canViewFull(profile, rel) {
  if (rel.isSelf) return true;
  if (rel.blocked) return false;
  if (profile.accountType === 'PUBLIC') return true;
  return rel.outgoing?.status === 'ACCEPTED';
}

/** Follow status from the viewer's perspective, used by the follow button. */
export function followStatusOf(rel) {
  if (rel.isSelf) return 'SELF';
  if (!rel.outgoing) return 'NONE';
  if (rel.outgoing.status === 'DECLINED') return 'NONE';
  return rel.outgoing.status;
}

/** User ids blocked by / blocking the viewer (to exclude from listings). */
export async function getBlockedIds(viewerId) {
  if (!viewerId) return [];
  const rows = await prisma.follow.findMany({
    where: { status: 'BLOCKED', OR: [{ senderId: viewerId }, { receiverId: viewerId }] },
    select: { senderId: true, receiverId: true },
  });
  return rows.map((r) => (r.senderId === viewerId ? r.receiverId : r.senderId));
}

/**
 * Compact card used in listings. Never contains the phone number.
 * @param {object} profile Profile row (with optional `user`)
 * @param {{ full: boolean, followStatus?: string, matchScore?: number|null, shortlisted?: boolean }} opts
 */
export function toProfileCard(profile, { full, followStatus = 'NONE', matchScore = null, shortlisted = false }) {
  const age = ageFromDob(profile.dateOfBirth);
  const base = {
    userId: profile.userId,
    accountType: profile.accountType,
    isVerified: profile.isVerified,
    gender: profile.gender,
    currentCity: profile.currentCity,
    currentState: profile.currentState,
    gotra: profile.gotra,
    // Height is shown even on private (locked) cards: it isn't identifying, and the height filter reveals it anyway
    heightCm: profile.heightCm,
    followStatus,
    matchScore,
    shortlisted,
    locked: !full,
  };
  if (!full) {
    // Private profile, not connected yet: the main photo and the basics are visible so families can decide
    // whether to send a request. Other photos, family, contacts, preferences and Kundali stay hidden.
    return {
      ...base,
      fullName: profile.fullName,
      age,
      ageRange: null,
      photoUrl: profile.profilePhotoUrl || null,
      education: profile.education,
      occupation: profile.occupation,
    };
  }
  return {
    ...base,
    fullName: profile.fullName,
    age,
    ageRange: null,
    photoUrl: profile.profilePhotoUrl || null,
    education: profile.education,
    occupation: profile.occupation,
  };
}

/**
 * Family contacts (matrimony). Numbers are shown only to members the owner chose:
 * a follow request they accepted, or someone they follow themselves. Public profiles accept follows
 * automatically, so a one-tap follow is NOT enough. Everyone else sees relation + name + a masked number.
 */
export function ownerApproved(rel) {
  if (rel.isSelf) return true;
  if (rel.blocked) return false;
  return (rel.outgoing?.status === 'ACCEPTED' && rel.outgoing.approvedByOwner) || rel.incoming?.status === 'ACCEPTED';
}

function familyContactsFor(profile, rel) {
  const list = profile.familyContacts || [];
  const visible = ownerApproved(rel);
  return {
    familyContacts: list.map((c) => ({
      relation: c.relation,
      relationLabel: c.relationLabel,
      name: c.name,
      phone: visible ? formatPhone(c.phone) : maskPhone(c.phone),
      bestTime: c.bestTime,
      languages: c.languages,
      isPrimary: c.isPrimary,
    })),
    familyContactsVisible: visible,
  };
}

/** Full profile document for the detail page (respecting privacy). */
export function toProfileDetail(profile, user, rel, extra = {}) {
  const full = canViewFull(profile, rel);
  const card = toProfileCard(profile, { full, followStatus: followStatusOf(rel), ...extra });
  const phoneVisible = rel.isSelf || (ownerApproved(rel) && profile.showPhone); // same rule as family numbers

  if (!full) {
    return {
      ...card,
      phone: maskPhone(user.phone),
      phoneVisible: false,
      // basics a private profile shares before connecting
      maritalStatus: profile.maritalStatus,
      nativeVillage: profile.nativeVillage,
      degrees: Array.isArray(profile.degrees) && profile.degrees.length ? profile.degrees : profile.education ? [{ degree: profile.education }] : [],
      photos: profile.profilePhotoUrl ? [{ id: 'main', url: profile.profilePhotoUrl }] : [],
      hiddenPhotoCount: Math.max(0, (profile.photos || []).length - 1),
      // locked profile: only say that family contacts exist, nothing about who they are
      familyContactCount: (profile.familyContacts || []).length,
      canMessage: rel.connected,
      incomingRequest: rel.incoming?.status === 'PENDING' ? rel.incoming.id : null,
    };
  }

  return {
    ...card,
    bio: profile.bio,
    dateOfBirth: rel.isSelf ? toDateString(profile.dateOfBirth) : undefined,
    maritalStatus: profile.maritalStatus,
    heightCm: profile.heightCm,
    nativeVillage: profile.nativeVillage,
    currentCountry: profile.currentCountry,
    annualIncome: profile.annualIncome,
    degrees: Array.isArray(profile.degrees) && profile.degrees.length ? profile.degrees : profile.education ? [{ degree: profile.education }] : [],
    workDetails: profile.workDetails,
    isMatrimonial: profile.isMatrimonial,
    subCaste: profile.subCaste,
    fatherName: profile.fatherName,
    fatherOccupation: profile.fatherOccupation,
    motherName: profile.motherName,
    siblingsCount: profile.siblingsCount,
    familyType: profile.familyType,
    rashi: profile.rashi,
    nakshatra: profile.nakshatra,
    prefAgeMin: profile.prefAgeMin,
    prefAgeMax: profile.prefAgeMax,
    prefEducation: profile.prefEducation,
    prefLocation: profile.prefLocation,
    photos: (profile.photos || []).map((p) => ({ id: p.id, url: p.url })),
    phone: phoneVisible ? formatPhone(user.phone) : maskPhone(user.phone),
    phoneVisible,
    ...familyContactsFor(profile, rel),
    canMessage: rel.isSelf ? false : rel.connected,
    incomingRequest: rel.incoming?.status === 'PENDING' ? rel.incoming.id : null,
    lastActiveAt: user.lastActiveAt,
    memberSince: user.createdAt,
  };
}

/**
 * Compatibility score (0-100) between the viewer and a candidate, based on the viewer's
 * stated partner preferences and, when both have it, the traditional Guna Milan score.
 */
export function computeMatchScore(viewer, candidate, gunaScore = null) {
  if (!viewer || !candidate) return null;
  let score = 60;
  const age = ageFromDob(candidate.dateOfBirth);
  if (viewer.prefAgeMin && viewer.prefAgeMax && age != null) {
    if (age >= viewer.prefAgeMin && age <= viewer.prefAgeMax) score += 15;
    else score -= Math.min(15, Math.min(Math.abs(age - viewer.prefAgeMin), Math.abs(age - viewer.prefAgeMax)) * 4);
  } else score += 8;
  const loc = (viewer.prefLocation || '').toLowerCase();
  if (loc && (candidate.currentCity || '').toLowerCase().includes(loc)) score += 10;
  else if (!loc || (candidate.currentState || '').toLowerCase().includes(loc)) score += 6;
  const edu = (viewer.prefEducation || '').toLowerCase();
  if (edu && (candidate.education || '').toLowerCase().includes(edu)) score += 8;
  else if (!edu) score += 4;
  if (candidate.isVerified) score += 4;
  if (viewer.gotra && candidate.gotra && viewer.gotra.toLowerCase() === candidate.gotra.toLowerCase()) score -= 12; // same-gotra is traditionally avoided
  if (gunaScore != null) score = Math.round(score * 0.7 + (gunaScore / 36) * 100 * 0.3);
  return Math.max(35, Math.min(99, Math.round(score)));
}
