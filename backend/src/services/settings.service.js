import { prisma } from '../lib/prisma.js';

/**
 * Admin-editable settings with safe defaults. Stored as strings in AppSetting; cached for 30 s.
 *   matrimonyFee        ₹ per membership period (default 501)
 *   membershipDays      length of one paid period (default 365)
 *   matrimonyPaidFrom   YYYY-MM-DD — before this date matrimony is free for everyone (default 2027-01-01)
 */
export const DEFAULT_SETTINGS = {
  matrimonyFee: 501,
  membershipDays: 365,
  matrimonyPaidFrom: '2027-01-01',
};

const PARSE = {
  matrimonyFee: (v) => Math.round(Number(v)),
  membershipDays: (v) => Math.round(Number(v)),
  matrimonyPaidFrom: (v) => String(v),
};

let cache = null;
let cachedAt = 0;

export async function getSettings() {
  if (cache && Date.now() - cachedAt < 30_000) return cache;
  const rows = await prisma.appSetting.findMany({ where: { key: { in: Object.keys(DEFAULT_SETTINGS) } } });
  const out = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    const v = PARSE[r.key](r.value);
    if (v !== '' && !Number.isNaN(v)) out[r.key] = v;
  }
  cache = out;
  cachedAt = Date.now();
  return out;
}

export async function updateSettings(patch, userId) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS) || value === undefined) continue;
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: String(value), updatedBy: userId },
      update: { value: String(value), updatedBy: userId },
    });
  }
  cache = null;
  return getSettings();
}

/** Midnight IST at the start of matrimonyPaidFrom. */
export function paidFromDate(settings) {
  return new Date(`${settings.matrimonyPaidFrom}T00:00:00+05:30`);
}
