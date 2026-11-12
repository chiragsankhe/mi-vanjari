import {
  GANA_NAMES,
  GANA_POINTS,
  NADI_NAMES,
  NAKSHATRAS,
  PLANET_RELATIONS,
  RASHIS,
  VARNA_NAMES,
  VASHYA_ORDER,
  VASHYA_POINTS,
  YONI_ORDER,
  YONI_POINTS,
} from './tables.js';
import { EclipticGeoMoon, MakeTime } from 'astronomy-engine';
import { explainMatch } from './interpret.js';

/**
 * Self-contained Vedic astrology engine — no third-party API required.
 *
 *  • Moon's tropical longitude from astronomy-engine (full lunar theory, arc-second accuracy).
 *  • Sidereal conversion with the Lahiri (Chitrapaksha) ayanamsa.
 *  • Ashtakoota (Guna Milan) matching on the classic 36-point scale.
 */

const norm = (x) => ((x % 360) + 360) % 360;

/** Julian Day for a UTC Date. */
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Tropical (sayana) ecliptic longitude of the Moon (true ecliptic of date), degrees. */
export function moonTropicalLongitude(jd) {
  return norm(EclipticGeoMoon(MakeTime(jd)).lon);
}

/** Lahiri ayanamsa (degrees), linear approximation around J2000 — error < 0.01° for 1900–2100. */
export function lahiriAyanamsa(jd) {
  const years = (jd - 2451545.0) / 365.25;
  return 23.85305 + years * 0.0139694;
}

/**
 * Compute Chandra Rashi + Nakshatra.
 * @param {string} dob  YYYY-MM-DD
 * @param {string} [tob] HH:mm local time (IST). Defaults to 12:00 when unknown.
 * @param {number} [utcOffsetHours=5.5]
 */
export function computeBirthChart(dob, tob, utcOffsetHours = 5.5) {
  const [y, mo, d] = dob.split('-').map(Number);
  const [hh, mm] = (tob || '12:00').split(':').map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, hh, mm) - utcOffsetHours * 3600_000;
  const jd = julianDay(new Date(utcMs));

  const tropical = moonTropicalLongitude(jd);
  const sidereal = norm(tropical - lahiriAyanamsa(jd));
  const rashiIndex = Math.floor(sidereal / 30);
  const span = 360 / 27;
  const nakIndex = Math.floor(sidereal / span);
  const pada = Math.floor((sidereal % span) / (span / 4)) + 1;

  const rashi = RASHIS[rashiIndex];
  const nak = NAKSHATRAS[nakIndex];

  // Moon moves ~13°/day: if time unknown, flag when the sign/nakshatra could change during the day
  let approximate = false;
  if (!tob) {
    const lo = norm(moonTropicalLongitude(jd - 0.5) - lahiriAyanamsa(jd));
    const hi = norm(moonTropicalLongitude(jd + 0.5) - lahiriAyanamsa(jd));
    approximate = Math.floor(lo / span) !== Math.floor(hi / span);
  }

  return {
    moonLongitude: Number(sidereal.toFixed(3)),
    degreeInSign: Number((sidereal % 30).toFixed(2)),
    rashiIndex,
    rashi: { ...rashi, varnaName: VARNA_NAMES[rashi.varna] },
    nakshatraIndex: nakIndex,
    nakshatra: { ...nak, pada, ganaName: GANA_NAMES[nak.gana], nadiName: NADI_NAMES[nak.nadi] },
    approximate,
  };
}

// ── Ashtakoota (Guna Milan) ──────────────────────────────────────────────────

function vashyaOf(chart) {
  const r = RASHIS[chart.rashiIndex];
  if (r.vashya2 && chart.degreeInSign >= 15) return r.vashya2;
  return r.vashya;
}

function planetRelation(a, b) {
  if (a === b) return 'friend';
  if (PLANET_RELATIONS[a].friends.includes(b)) return 'friend';
  if (PLANET_RELATIONS[a].enemies.includes(b)) return 'enemy';
  return 'neutral';
}

function grahaMaitriPoints(lordBoy, lordGirl) {
  if (lordBoy === lordGirl) return 5;
  const r = [planetRelation(lordBoy, lordGirl), planetRelation(lordGirl, lordBoy)].sort().join('+');
  return { 'friend+friend': 5, 'friend+neutral': 4, 'neutral+neutral': 3, 'enemy+friend': 1, 'enemy+neutral': 0.5, 'enemy+enemy': 0 }[r];
}

function taraOk(from, to) {
  const count = ((to - from + 27) % 27) + 1;
  return ![3, 5, 7].includes(count % 9);
}

/** Yoni (4 points): the classical 14 × 14 table, 4 = same animal … 0 = sworn enemies. */
function yoniPoints(a, b) {
  const i = YONI_ORDER.indexOf(a);
  const j = YONI_ORDER.indexOf(b);
  return i < 0 || j < 0 ? 2 : YONI_POINTS[i][j];
}

/**
 * Ashtakoota compatibility.
 * @param {ReturnType<typeof computeBirthChart>} boy
 * @param {ReturnType<typeof computeBirthChart>} girl
 */
export function gunaMilan(boy, girl) {
  const rb = RASHIS[boy.rashiIndex];
  const rg = RASHIS[girl.rashiIndex];
  const nb = NAKSHATRAS[boy.nakshatraIndex];
  const ng = NAKSHATRAS[girl.nakshatraIndex];

  const varna = rb.varna >= rg.varna ? 1 : 0;
  const vashya = VASHYA_POINTS[VASHYA_ORDER.indexOf(vashyaOf(boy))][VASHYA_ORDER.indexOf(vashyaOf(girl))];
  const taraCount = [taraOk(girl.nakshatraIndex, boy.nakshatraIndex), taraOk(boy.nakshatraIndex, girl.nakshatraIndex)].filter(Boolean).length;
  const tara = taraCount === 2 ? 3 : taraCount === 1 ? 1.5 : 0;
  const yoni = yoniPoints(nb.yoni, ng.yoni);
  const maitri = grahaMaitriPoints(rb.lord, rg.lord);
  const gana = GANA_POINTS[nb.gana][ng.gana];
  const dist = ((boy.rashiIndex - girl.rashiIndex + 12) % 12) + 1;
  const pair = [dist, 14 - dist].sort((a, b) => a - b).join('/');
  const bhakootDosha = ['2/12', '5/9', '6/8'].includes(pair);
  const bhakoot = bhakootDosha ? 0 : 7;
  const nadiDosha = nb.nadi === ng.nadi;
  const nadi = nadiDosha ? 0 : 8;

  const kootas = [
    { key: 'varna', name: 'Varna', mr: 'वर्ण', max: 1, score: varna, about: 'Spiritual & ego compatibility', boy: VARNA_NAMES[rb.varna], girl: VARNA_NAMES[rg.varna] },
    { key: 'vashya', name: 'Vashya', mr: 'वश्य', max: 2, score: vashya, about: 'Mutual attraction & influence', boy: vashyaOf(boy), girl: vashyaOf(girl) },
    { key: 'tara', name: 'Tara', mr: 'तारा', max: 3, score: tara, about: 'Health & well-being', boy: nb.name, girl: ng.name },
    { key: 'yoni', name: 'Yoni', mr: 'योनी', max: 4, score: yoni, about: 'Physical & temperamental harmony', boy: nb.yoni, girl: ng.yoni },
    { key: 'maitri', name: 'Graha Maitri', mr: 'ग्रहमैत्री', max: 5, score: maitri, about: 'Mental compatibility & friendship', boy: rb.lord, girl: rg.lord },
    { key: 'gana', name: 'Gana', mr: 'गण', max: 6, score: gana, about: 'Nature & temperament', boy: GANA_NAMES[nb.gana], girl: GANA_NAMES[ng.gana] },
    { key: 'bhakoot', name: 'Bhakoot', mr: 'भकूट', max: 7, score: bhakoot, about: 'Family welfare & prosperity', boy: rb.name, girl: rg.name, pair },
    { key: 'nadi', name: 'Nadi', mr: 'नाडी', max: 8, score: nadi, about: 'Health & progeny', boy: NADI_NAMES[nb.nadi], girl: NADI_NAMES[ng.nadi] },
  ];
  const total = kootas.reduce((s, k) => s + k.score, 0);

  let verdict;
  if (total >= 33) verdict = { level: 'excellent', label: 'Excellent match', mr: 'उत्तम जुळणी' };
  else if (total >= 25) verdict = { level: 'good', label: 'Very good match', mr: 'चांगली जुळणी' };
  else if (total >= 18) verdict = { level: 'average', label: 'Acceptable match', mr: 'मध्यम जुळणी' };
  else verdict = { level: 'low', label: 'Not recommended', mr: 'जुळणी कमी' };

  return explainMatch({ total, max: 36, kootas, verdict, doshas: { nadi: nadiDosha, bhakoot: bhakootDosha } }, boy, girl);
}

/** Find indices from stored names (used when profiles have rashi/nakshatra saved). */
export function chartFromNames(rashiName, nakshatraName) {
  const rashiIndex = RASHIS.findIndex((r) => r.name === rashiName);
  const nakshatraIndex = NAKSHATRAS.findIndex((n) => n.name === nakshatraName);
  if (rashiIndex < 0 || nakshatraIndex < 0) return null;
  return { rashiIndex, nakshatraIndex, degreeInSign: 0 };
}
