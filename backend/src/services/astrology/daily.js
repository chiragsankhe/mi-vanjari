/**
 * Daily panchang + muhurat timeline for any place in India.
 *
 * Everything is calculated (astronomy-engine for Sun, Moon, Jupiter, Venus; Lahiri ayanamsa):
 *  • sunrise / sunset for the chosen place
 *  • tithi, nakshatra, yoga, karana — with the exact times they change during the day
 *  • Rahu Kaal, Yamaganda, Gulika, Abhijit muhurta, Brahma muhurta, Choghadiya (day + night)
 *  • lunar month (amanta, with Adhik detection), Chaturmas, Kharmas, Guru/Shukra asta
 *  • Vivah windows: the parts of the day where nakshatra, tithi, yoga and karana are all favourable and no
 *    inauspicious period (Rahu/Yamaganda/Gulika, bad Choghadiya) overlaps.
 * The rules are the classical Marathi-panchang ones; families should still confirm a wedding date with their priest.
 */
import * as A from 'astronomy-engine';
import { julianDay, lahiriAyanamsa } from './engine.js';
import { NAKSHATRAS } from './tables.js';

const norm = (x) => ((x % 360) + 360) % 360;
const MIN = 60_000;
const HOUR = 3_600_000;

// ── names ────────────────────────────────────────────────────────────────────
const TITHI_EN = ['Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi'];
const TITHI_MR = ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'];
const YOGA_EN = ['Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti'];
const KARANA_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];
const MONTHS = [
  ['Chaitra', 'चैत्र'], ['Vaishakh', 'वैशाख'], ['Jyeshtha', 'ज्येष्ठ'], ['Ashadh', 'आषाढ'], ['Shravan', 'श्रावण'], ['Bhadrapad', 'भाद्रपद'],
  ['Ashwin', 'आश्विन'], ['Kartik', 'कार्तिक'], ['Margashirsh', 'मार्गशीर्ष'], ['Paush', 'पौष'], ['Magh', 'माघ'], ['Phalgun', 'फाल्गुन'],
];
const WEEKDAYS = [
  ['Sunday', 'रविवार'], ['Monday', 'सोमवार'], ['Tuesday', 'मंगळवार'], ['Wednesday', 'बुधवार'], ['Thursday', 'गुरुवार'], ['Friday', 'शुक्रवार'], ['Saturday', 'शनिवार'],
];

function tithiInfo(index) {
  // index 0..29: 0–14 Shukla (waxing), 15–29 Krishna (waning)
  const paksha = index < 15 ? 'Shukla' : 'Krishna';
  const n = (index % 15) + 1;
  const last = n === 15;
  return {
    number: index + 1,
    inPaksha: n,
    paksha,
    pakshaMr: paksha === 'Shukla' ? 'शुक्ल' : 'कृष्ण',
    name: last ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya') : TITHI_EN[n - 1],
    nameMr: last ? (paksha === 'Shukla' ? 'पौर्णिमा' : 'अमावस्या') : TITHI_MR[n - 1],
  };
}
function karanaInfo(index) {
  // 0..59: Kimstughna, then 7 movable ones repeating 8 times, then Shakuni, Chatushpada, Naga
  const name = index === 0 ? 'Kimstughna' : index >= 57 ? ['Shakuni', 'Chatushpada', 'Naga'][index - 57] : KARANA_MOVABLE[(index - 1) % 7];
  return { name, bad: name === 'Vishti' }; // Vishti = Bhadra
}

// ── astronomy helpers (t = ms since epoch) ───────────────────────────────────
const at = (t) => new Date(t);
const sunTrop = (t) => A.SunPosition(at(t)).elon;
const moonTrop = (t) => A.EclipticGeoMoon(at(t)).lon;
const ayan = (t) => lahiriAyanamsa(julianDay(at(t)));
const sunSid = (t) => norm(sunTrop(t) - ayan(t));
const moonSid = (t) => norm(moonTrop(t) - ayan(t));
const elongation = (t) => norm(moonTrop(t) - sunTrop(t));
const yogaAngle = (t) => norm(sunSid(t) + moonSid(t));

/** Times in [t0, t1] where fn (an angle that only increases) passes a multiple of `unit` degrees. */
function crossings(fn, unit, t0, t1, step = 20 * MIN) {
  const out = [];
  let a = t0;
  let ia = Math.floor(fn(a) / unit);
  while (a < t1) {
    const b = Math.min(a + step, t1);
    const ib = Math.floor(fn(b) / unit);
    if (ib !== ia) {
      const target = ((ia + 1) * unit) % 360;
      let lo = a;
      let hi = b;
      for (let k = 0; k < 36; k++) {
        const m = (lo + hi) / 2;
        const d = ((fn(m) - target + 540) % 360) - 180;
        if (d < 0) lo = m;
        else hi = m;
      }
      out.push({ t: hi, to: ib });
    }
    a = b;
    ia = ib;
  }
  return out;
}

/** Splits [t0, t1] into segments of constant index. */
function segmentsOf(fn, unit, t0, t1) {
  const segs = [];
  let start = t0;
  let index = Math.floor(fn(t0) / unit);
  for (const c of crossings(fn, unit, t0, t1)) {
    segs.push({ index, start, end: c.t });
    start = c.t;
    index = c.to;
  }
  segs.push({ index, start, end: t1 });
  return segs;
}
const segAt = (segs, t) => segs.find((s) => t >= s.start && t < s.end) || segs[segs.length - 1];

// ── periods that depend on the weekday ───────────────────────────────────────
// which eighth of the daytime (1 = right after sunrise) — index 0 = Sunday
const RAHU = [8, 2, 7, 5, 6, 4, 3];
const YAMA = [5, 4, 3, 2, 1, 7, 6];
const GULIKA = [7, 6, 5, 4, 3, 2, 1];
const CHOGHADIYA = ['Udveg', 'Chal', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'];
const CHOG_DAY_FIRST = [0, 3, 6, 2, 5, 1, 4]; // Sun Udveg, Mon Amrit, Tue Rog, Wed Labh, Thu Shubh, Fri Chal, Sat Kaal
const CHOG_NIGHT_FIRST = [5, 1, 4, 0, 3, 6, 2]; // Sun Shubh, Mon Chal, Tue Kaal, Wed Udveg, Thu Amrit, Fri Rog, Sat Labh
const CHOG_META = {
  Amrit: { quality: 'good', mr: 'अमृत' },
  Shubh: { quality: 'good', mr: 'शुभ' },
  Labh: { quality: 'good', mr: 'लाभ' },
  Chal: { quality: 'neutral', mr: 'चल' },
  Udveg: { quality: 'bad', mr: 'उद्वेग' },
  Rog: { quality: 'bad', mr: 'रोग' },
  Kaal: { quality: 'bad', mr: 'काळ' },
};

// ── Vivah rules ──────────────────────────────────────────────────────────────
// nakshatra index (0 = Ashwini): Rohini, Mrigashira, Magha, U. Phalguni, Hasta, Swati, Anuradha, Mula, U. Ashadha, U. Bhadrapada, Revati
const VIVAH_NAKSHATRAS = new Set([3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26]);
// tithi numbers 1–30 to avoid: Rikta (4, 9, 14 of either paksha), Ashtami, Amavasya, and Pratipada
const VIVAH_BAD_TITHI = new Set([1, 4, 8, 9, 14, 16, 19, 23, 24, 29, 30]);
const VIVAH_STRONG_TITHI = new Set([2, 3, 5, 7, 10, 11, 12, 13]);
const BAD_YOGAS = new Set([16, 26]); // Vyatipata and Vaidhriti: avoided for every auspicious work (other yogas only matter in rare partial-ghati rules)
const GOOD_WEEKDAYS = new Set([1, 3, 4, 5]); // Mon, Wed, Thu, Fri rate higher; Sun/Tue/Sat are allowed but not 'best'

/** Lunar month (amanta) for a moment, from the two surrounding new moons. */
function lunarMonth(t) {
  const sun = (m) => Math.floor(sunSid(m) / 30);
  const nm = (from, days) => A.SearchMoonPhase(0, at(from), days)?.date.getTime();
  let prev = nm(t - 30 * 86_400_000, 31);
  const second = prev && nm(prev + 86_400_000, 31);
  if (second && second <= t) prev = second;
  const next = nm(prev + 86_400_000, 31);
  const r0 = sun(prev);
  const adhik = sun(next) === r0;
  return { index: (r0 + 1) % 12, adhik };
}

const fmtMin = (ms, mid) => Math.round(((ms - mid) / MIN) * 10) / 10;

/**
 * @param {{ date: string, lat: number, lon: number, utcOffset?: number, purpose?: 'vivah'|'general' }} p
 */
export function computeDay({ date, lat, lon, utcOffset = 5.5, purpose = 'vivah' }) {
  const [y, m, d] = date.split('-').map(Number);
  const mid = Date.UTC(y, m - 1, d) - utcOffset * HOUR; // local midnight
  const end = mid + 24 * HOUR;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const obs = new A.Observer(lat, lon, 0);
  const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, at(mid), 1)?.date.getTime();
  const set = rise && A.SearchRiseSet(A.Body.Sun, obs, -1, at(rise), 1)?.date.getTime();
  const nextRise = set && A.SearchRiseSet(A.Body.Sun, obs, +1, at(set), 1)?.date.getTime();
  if (!rise || !set || !nextRise) throw new Error('No sunrise/sunset at this place on this date');

  const dayLen = set - rise;
  const part = dayLen / 8;
  const period = (n) => ({ start: rise + (n - 1) * part, end: rise + n * part });
  const rahu = period(RAHU[weekday]);
  const yama = period(YAMA[weekday]);
  const gulika = period(GULIKA[weekday]);
  const muhurta = dayLen / 15;
  const abhijit = { start: rise + 7 * muhurta, end: rise + 8 * muhurta };
  const brahma = { start: rise - 96 * MIN, end: rise - 48 * MIN };

  // panchang over the civil day (a few hours either side so a window that starts late still sees its change-over)
  const t0 = mid;
  const t1 = end;
  const tithiSegs = segmentsOf(elongation, 12, t0, t1);
  const karanaSegs = segmentsOf(elongation, 6, t0, t1);
  const nakSegs = segmentsOf(moonSid, 360 / 27, t0, t1);
  const yogaSegs = segmentsOf(yogaAngle, 360 / 27, t0, t1);
  const sankranti = crossings(sunSid, 30, t0, t1)[0];

  // Choghadiya: 8 day parts + 8 night parts
  const chog = [];
  const dayFirst = CHOG_DAY_FIRST[weekday];
  const nightFirst = CHOG_NIGHT_FIRST[weekday];
  const nightLen = nextRise - set;
  for (let i = 0; i < 8; i++) chog.push({ name: CHOGHADIYA[(dayFirst + i) % 7], night: false, start: rise + (i * dayLen) / 8, end: rise + ((i + 1) * dayLen) / 8 });
  for (let i = 0; i < 8; i++) chog.push({ name: CHOGHADIYA[(nightFirst + i) % 7], night: true, start: set + (i * nightLen) / 8, end: set + ((i + 1) * nightLen) / 8 });

  // day-level facts at sunrise
  const tAtRise = segAt(tithiSegs, rise).index;
  const tithi = tithiInfo(tAtRise);
  const month = lunarMonth(rise);
  const sunRashi = Math.floor(sunSid(rise) / 30);
  const kharmas = sunRashi === 8 || sunRashi === 11; // Sun in Dhanu or Meena
  const ma = month.index;
  const chaturmas = !month.adhik && ((ma === 3 && (tithi.paksha === 'Krishna' || tithi.inPaksha >= 11)) || ma === 4 || ma === 5 || ma === 6 || (ma === 7 && tithi.paksha === 'Shukla' && tithi.inPaksha <= 11));
  const jupiterAsta = A.AngleFromSun(A.Body.Jupiter, at(rise)) < 11;
  // Venus: 10° from the Sun when moving forward, 8° when retrograde (classical limits); Jupiter 11°
  const venusRetro = A.EclipticLongitude(A.Body.Venus, at(rise + 86_400_000)) - A.EclipticLongitude(A.Body.Venus, at(rise)) < 0 && Math.abs(A.EclipticLongitude(A.Body.Venus, at(rise + 86_400_000)) - A.EclipticLongitude(A.Body.Venus, at(rise))) < 90;
  const venusAsta = A.AngleFromSun(A.Body.Venus, at(rise)) < (venusRetro ? 8 : 10);

  const dayNotes = []; // reasons the whole day is not suitable for a wedding
  if (month.adhik) dayNotes.push({ key: 'adhik', en: 'Adhik maas (extra month)', mr: 'अधिक मास' });
  if (chaturmas) dayNotes.push({ key: 'chaturmas', en: 'Chaturmas (Ashadhi to Kartiki Ekadashi)', mr: 'चातुर्मास' });
  if (kharmas) dayNotes.push({ key: 'kharmas', en: 'Kharmas (Sun in Dhanu / Meena)', mr: 'खरमास' });
  if (jupiterAsta) dayNotes.push({ key: 'guru-asta', en: 'Guru asta (Jupiter set)', mr: 'गुरू अस्त' });
  if (venusAsta) dayNotes.push({ key: 'shukra-asta', en: 'Shukra asta (Venus set)', mr: 'शुक्र अस्त' });
  const wholeDayBlocked = dayNotes.length > 0;

  // ── good windows between sunrise and sunset ──
  const cuts = new Set([rise, set]);
  const addCut = (x) => x > rise && x < set && cuts.add(x);
  [...tithiSegs, ...karanaSegs, ...nakSegs, ...yogaSegs].forEach((s) => (addCut(s.start), addCut(s.end)));
  [rahu, yama, gulika].forEach((p) => (addCut(p.start), addCut(p.end)));
  chog.filter((c) => !c.night).forEach((c) => (addCut(c.start), addCut(c.end)));
  const edges = [...cuts].sort((a, b) => a - b);
  const pieces = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i];
    const b = edges[i + 1];
    if (b - a < 1000) continue;
    const mp = (a + b) / 2;
    const ti = tithiInfo(segAt(tithiSegs, mp).index);
    const nk = segAt(nakSegs, mp).index;
    const yg = segAt(yogaSegs, mp).index;
    const ka = karanaInfo(segAt(karanaSegs, mp).index % 60);
    const cg = chog.find((c) => !c.night && mp >= c.start && mp < c.end);
    const inBad = [rahu, yama, gulika].some((p) => mp >= p.start && mp < p.end);
    const cgQ = CHOG_META[cg.name].quality;
    // 1) is the panchang itself favourable at this moment?
    const valid = purpose === 'vivah' ? !wholeDayBlocked && VIVAH_NAKSHATRAS.has(nk) && !VIVAH_BAD_TITHI.has(ti.number) && !BAD_YOGAS.has(yg) && !ka.bad : !BAD_YOGAS.has(yg) && !ka.bad;
    // 2) …and is it also clear of Rahu / Yamaganda / Gulika and a bad Choghadiya?
    const clean = valid && !inBad && cgQ !== 'bad';
    const strong = clean && cgQ === 'good' && (purpose !== 'vivah' || (VIVAH_STRONG_TITHI.has(ti.number) && GOOD_WEEKDAYS.has(weekday)));
    pieces.push({ start: a, end: b, valid, clean, strong });
  }
  const merge = (keep) => {
    const list = [];
    for (const p of pieces) {
      if (!keep(p)) continue;
      const last = list[list.length - 1];
      if (last && Math.abs(last.end - p.start) < 1000) {
        last.end = p.end;
        last.strong ||= p.strong;
      } else list.push({ start: p.start, end: p.end, strong: p.strong });
    }
    return list.filter((w) => w.end - w.start >= 25 * MIN);
  };
  const goodWindows = merge((p) => p.clean);
  const panchangWindows = merge((p) => p.valid);

  const out = (s) => ({ ...s, startMin: fmtMin(s.start, mid), endMin: fmtMin(s.end, mid) });
  return {
    date,
    purpose,
    weekday: { index: weekday, en: WEEKDAYS[weekday][0], mr: WEEKDAYS[weekday][1] },
    sunrise: fmtMin(rise, mid),
    sunset: fmtMin(set, mid),
    nextSunrise: fmtMin(nextRise, mid),
    tithi: { ...tithi, atSunrise: true },
    nakshatraAtSunrise: NAKSHATRAS[segAt(nakSegs, rise).index].name,
    month: { en: MONTHS[month.index][0], mr: MONTHS[month.index][1], adhik: month.adhik },
    sankranti: sankranti ? { atMin: fmtMin(sankranti.t, mid), toRashiIndex: Math.floor(sunSid(sankranti.t + 1000) / 30) } : null,
    // best = favourable panchang and a clear, very good time · good = a clear time · possible = favourable panchang but
    // every moment overlaps Rahu/Yamaganda/Gulika or a bad Choghadiya · none · blocked = whole day excluded (see notes)
    status: wholeDayBlocked ? 'blocked' : goodWindows.length ? (goodWindows.some((w) => w.strong) ? 'best' : 'good') : panchangWindows.length ? 'possible' : 'none',
    notes: dayNotes,
    windows: goodWindows.map((w) => ({ startMin: fmtMin(w.start, mid), endMin: fmtMin(w.end, mid), strong: w.strong })),
    panchangWindows: panchangWindows.map((w) => ({ startMin: fmtMin(w.start, mid), endMin: fmtMin(w.end, mid) })),
    goodMinutes: Math.round(goodWindows.reduce((s, w) => s + (w.end - w.start), 0) / MIN),
    avoid: [
      { key: 'rahu', en: 'Rahu Kaal', mr: 'राहुकाळ', ...out(rahu) },
      { key: 'yamaganda', en: 'Yamaganda', mr: 'यमगंड', ...out(yama) },
      { key: 'gulika', en: 'Gulika Kaal', mr: 'गुलिक काळ', ...out(gulika) },
    ],
    favourable: [
      { key: 'brahma', en: 'Brahma Muhurta', mr: 'ब्राह्म मुहूर्त', ...out(brahma) },
      { key: 'abhijit', en: 'Abhijit Muhurta', mr: 'अभिजित मुहूर्त', ...out(abhijit) },
    ],
    choghadiya: chog.map((c) => ({ name: c.name, mr: CHOG_META[c.name].mr, quality: CHOG_META[c.name].quality, night: c.night, startMin: fmtMin(c.start, mid), endMin: fmtMin(c.end, mid) })),
    panchang: {
      tithi: tithiSegs.map((s) => ({ ...tithiInfo(s.index), startMin: fmtMin(s.start, mid), endMin: fmtMin(s.end, mid) })),
      nakshatra: nakSegs.map((s) => ({ index: s.index, name: NAKSHATRAS[s.index].name, mr: NAKSHATRAS[s.index].mr, good: VIVAH_NAKSHATRAS.has(s.index), startMin: fmtMin(s.start, mid), endMin: fmtMin(s.end, mid) })),
      yoga: yogaSegs.map((s) => ({ index: s.index, name: YOGA_EN[s.index], bad: BAD_YOGAS.has(s.index), startMin: fmtMin(s.start, mid), endMin: fmtMin(s.end, mid) })),
      karana: karanaSegs.map((s) => ({ ...karanaInfo(s.index % 60), startMin: fmtMin(s.start, mid), endMin: fmtMin(s.end, mid) })),
    },
  };
}

/** One day's headline for the month calendar (cheaper to read than the full day). */
export function summarizeDay(day) {
  const first = day.windows[0] || day.panchangWindows[0];
  return {
    date: day.date,
    weekday: day.weekday.index,
    status: day.status,
    tithi: { number: day.tithi.number, inPaksha: day.tithi.inPaksha, paksha: day.tithi.paksha, name: day.tithi.name, nameMr: day.tithi.nameMr },
    nakshatra: day.nakshatraAtSunrise,
    goodMinutes: day.goodMinutes,
    firstWindow: first ? [first.startMin, first.endMin] : null,
    notes: day.notes.map((n) => n.key),
    ekadashi: day.tithi.inPaksha === 11,
    purnima: day.tithi.number === 15,
    amavasya: day.tithi.number === 30,
    sankranti: Boolean(day.sankranti),
  };
}

export function computeMonth({ year, month, lat, lon, utcOffset = 5.5, purpose = 'vivah' }) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push(summarizeDay(computeDay({ date, lat, lon, utcOffset, purpose })));
  }
  return { year, month, purpose, days: out };
}
