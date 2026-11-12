import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { optionalAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { computeBirthChart, gunaMilan } from '../../services/astrology/engine.js';
import { computeKundali } from '../../services/astrology/chart.js';
import { resolveBirthPlace, searchPlaces, utcOffsetHours } from '../../services/astrology/lookup.js';
import { placesLimiter } from '../../middleware/rateLimit.js';
import { monthPanchang } from '../../services/astrology/panchang.js';
import { NAKSHATRAS, RASHIS } from '../../services/astrology/tables.js';
import { h } from '../../utils/http.js';

const router = Router();

const birth = z.object({
  name: z.string().trim().max(80).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tob: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  place: z.string().trim().max(120).optional(),
  // chosen from the place suggestions (exact coordinates + time zone)
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  tz: z.string().trim().max(60).optional(),
});

/** Birthplace + the UTC offset valid at that place on that date (India is always +5:30). */
async function birthContext(b) {
  const where = await resolveBirthPlace({ place: b.place, lat: b.lat, lon: b.lon, tz: b.tz });
  return { where, offset: utcOffsetHours(where.tz, b.dob, b.tob) };
}

/** GET /astrology/rashis — reference table */
router.get('/rashis', (_req, res) => res.json({ rashis: RASHIS, nakshatras: NAKSHATRAS }));

/** POST /astrology/rashi { dob, tob, place } → Chandra rashi + nakshatra */
router.post(
  '/rashi',
  optionalAuth,
  validate({ body: birth }),
  h(async (req, res) => {
    const { dob, tob, place } = req.body;
    const { where, offset } = await birthContext(req.body);
    const chart = computeBirthChart(dob, tob, offset);
    prisma.rashiRecord
      .create({
        data: {
          userId: req.user?.id ?? null,
          dateOfBirth: new Date(`${dob}T00:00:00Z`),
          timeOfBirth: tob ?? null,
          placeOfBirth: (where.matched ? where.name : place) || 'Unknown',
          rashi: chart.rashi.name,
          nakshatra: chart.nakshatra.name,
          rulingPlanet: chart.rashi.lord,
        },
      })
      .catch(() => {});
    res.json({ ...chart, place: where, input: { dob, tob: tob ?? null, place: place ?? null } });
  }),
);

/** POST /astrology/kundali { dob, tob?, place? } → Janma Kundali (North Indian chart): Lagna, 9 grahas, 12 houses */
router.post(
  '/kundali',
  validate({ body: birth }),
  h(async (req, res) => {
    const year = Number(req.body.dob.slice(0, 4));
    if (year < 1900 || year > 2100) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Date of birth must be between 1900 and 2100' } });
    const { where, offset } = await birthContext(req.body);
    res.json(computeKundali({ dob: req.body.dob, tob: req.body.tob, where, utcOffsetHours: offset }));
  }),
);

/** GET /astrology/places?q=varan → birthplace suggestions for the whole of India (village / taluka level) */
router.get(
  '/places',
  placesLimiter,
  h(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=3600');
    res.json(await searchPlaces(String(req.query.q || '').slice(0, 60)));
  }),
);

/** POST /astrology/match { boy: {dob,tob}, girl: {dob,tob} } → Ashtakoota score */
router.post(
  '/match',
  validate({ body: z.object({ boy: birth, girl: birth }) }),
  h(async (req, res) => {
    const [bc, gc] = await Promise.all([birthContext(req.body.boy), birthContext(req.body.girl)]);
    const boy = computeBirthChart(req.body.boy.dob, req.body.boy.tob, bc.offset);
    const girl = computeBirthChart(req.body.girl.dob, req.body.girl.tob, gc.offset);
    res.json({ ...gunaMilan(boy, girl), boy, girl });
  }),
);

/** GET /astrology/panchang?year&month → tithi, paksha, nakshatra, Moon rashi & observances for every day */
router.get(
  '/panchang',
  validate({ query: z.object({ year: z.coerce.number().int().min(1900).max(2100), month: z.coerce.number().int().min(1).max(12) }) }),
  (req, res) => {
    res.set('Cache-Control', 'public, max-age=86400'); // pure calculation — never changes
    res.json(monthPanchang(req.query.year, req.query.month));
  },
);

/** GET /astrology/muhurat?month&year&type */
router.get(
  '/muhurat',
  validate({
    query: z.object({
      year: z.coerce.number().int().min(2000).max(2100).optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      type: z.string().max(30).optional(),
    }),
  }),
  h(async (req, res) => {
    const year = req.query.year ?? new Date().getFullYear();
    const from = req.query.month ? new Date(Date.UTC(year, req.query.month - 1, 1)) : new Date(Date.UTC(year, 0, 1));
    const to = req.query.month ? new Date(Date.UTC(year, req.query.month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
    const rows = await prisma.muhuratDate.findMany({
      where: { date: { gte: from, lt: to }, ...(req.query.type && { type: req.query.type }) },
      orderBy: { date: 'asc' },
    });
    res.json(rows.map((r) => ({ ...r, date: r.date.toISOString().slice(0, 10) })));
  }),
);

export default router;
