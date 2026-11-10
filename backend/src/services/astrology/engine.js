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
  YONI_ENEMIES,
} from './tables.js';
import { explainMatch } from './interpret.js';

/**
 * Self-contained Vedic astrology engine — no third-party API required.
 *
 *  • Moon's tropical longitude: truncated ELP-2000/82 series (Meeus, "Astronomical Algorithms", ch. 47),
 *    accurate to roughly ±0.05° — far finer than the 13°20′ width of a nakshatra.
 *  • Sidereal conversion with the Lahiri (Chitrapaksha) ayanamsa.
 *  • Ashtakoota (Guna Milan) matching on the classic 36-point scale.
 */

const DEG = Math.PI / 180;
const norm = (x) => ((x % 360) + 360) % 360;
const sin = (d) => Math.sin(d * DEG);

// [D, M, M', F, coefficient (1e-6 degrees)]
const LONGITUDE_TERMS = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994], [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390], [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048], [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691], [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520], [1, 0, -2, 0, -487], [2, 1, 0, -2, -399], [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330], [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294],
];

/** Julian Day for a UTC Date. */
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Tropical (sayana) ecliptic longitude of the Moon, degrees. */
export function moonTropicalLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = norm(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T ** 3) / 538841 - (T ** 4) / 65194000);
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T ** 3) / 545868 - (T ** 4) / 113065000);
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T ** 3) / 24490000);
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T ** 3) / 69699 - (T ** 4) / 14712000);
  const F = norm(93.272095 + 483202.0175233 * T - 0.0036539 * T * T - (T ** 3) / 3526000 + (T ** 4) / 863310000);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const A1 = norm(119.75 + 131.849 * T);
  const A2 = norm(53.09 + 479264.29 * T);

  let sum = 0;
  for (const [d, m, mp, f, c] of LONGITUDE_TERMS) {
    const e = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1;
    sum += c * e * sin(d * D + m * M + mp * Mp + f * F);
  }
  sum += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  return norm(Lp + sum / 1e6);
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

function yoniPoints(a, b) {
  if (a === b) return 4;
  if (YONI_ENEMIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 0;
  return 2;
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
