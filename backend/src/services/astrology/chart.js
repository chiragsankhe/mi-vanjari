/**
 * Janma Kundali (birth chart), North Indian style.
 *
 * Planet positions come from astronomy-engine (geocentric, true ecliptic of date), converted to sidereal
 * (nirayana) longitudes with the Lahiri ayanamsa. Lagna (ascendant) uses local sidereal time + latitude.
 * Houses are whole-sign: house 1 = the Lagna's rashi, then counter-clockwise.
 * Rahu/Ketu use the mean lunar node (the convention most Indian almanacs print).
 * Without a birth time the Lagna is unknown, so a Chandra Kundali (Moon sign as house 1) is returned instead.
 */
import * as A from 'astronomy-engine';
import { julianDay, lahiriAyanamsa } from './engine.js';
import { NAKSHATRAS, RASHIS } from './tables.js';

const norm = (x) => ((x % 360) + 360) % 360;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export const PLANETS = [
  { key: 'Sun', short: 'Su', name: 'Sun', nameMr: 'सूर्य', body: A.Body.Sun },
  { key: 'Moon', short: 'Mo', name: 'Moon', nameMr: 'चंद्र', body: A.Body.Moon },
  { key: 'Mars', short: 'Ma', name: 'Mars', nameMr: 'मंगळ', body: A.Body.Mars },
  { key: 'Mercury', short: 'Me', name: 'Mercury', nameMr: 'बुध', body: A.Body.Mercury },
  { key: 'Jupiter', short: 'Ju', name: 'Jupiter', nameMr: 'गुरु', body: A.Body.Jupiter },
  { key: 'Venus', short: 'Ve', name: 'Venus', nameMr: 'शुक्र', body: A.Body.Venus },
  { key: 'Saturn', short: 'Sa', name: 'Saturn', nameMr: 'शनि', body: A.Body.Saturn },
  { key: 'Rahu', short: 'Ra', name: 'Rahu', nameMr: 'राहू' },
  { key: 'Ketu', short: 'Ke', name: 'Ketu', nameMr: 'केतू' },
];

/** Tropical geocentric longitude of a body (true ecliptic of date). */
function tropicalLongitude(body, time) {
  if (body === A.Body.Sun) return A.SunPosition(time).elon;
  if (body === A.Body.Moon) return A.EclipticGeoMoon(time).lon;
  return A.Ecliptic(A.GeoVector(body, time, true)).elon;
}

/** Mean ascending lunar node (Rahu), tropical degrees (Meeus 47.7). */
function meanNode(jd) {
  const T = (jd - 2451545.0) / 36525;
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T ** 3) / 467441);
}

/** Tropical ascendant for a moment and place. */
function tropicalAscendant(time, lat, lon) {
  const ramc = rad(norm(A.SiderealTime(time) * 15 + lon)); // local sidereal time as an angle
  const eps = rad(A.e_tilt(time).tobl); // true obliquity
  return norm(deg(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(rad(lat)) * Math.sin(eps)))));
}

const signOf = (lon) => Math.floor(lon / 30); // 0 = Mesha
function describe(lon) {
  const span = 360 / 27;
  const n = Math.floor(lon / span);
  return {
    longitude: Number(lon.toFixed(3)),
    rashi: RASHIS[signOf(lon)].name,
    rashiMr: RASHIS[signOf(lon)].mr,
    rashiEn: RASHIS[signOf(lon)].en,
    rashiNumber: signOf(lon) + 1,
    degree: Number((lon % 30).toFixed(2)), // degrees inside the rashi
    nakshatra: NAKSHATRAS[n].name,
    pada: Math.floor((lon % span) / (span / 4)) + 1,
  };
}

/**
 * @param {{ dob: string, tob?: string, where: { name: string, lat: number, lon: number }, utcOffsetHours?: number }} input
 *   dob YYYY-MM-DD, tob HH:mm local time at the birthplace, where = resolved birthplace (see lookup.js)
 */
export function computeKundali({ dob, tob, where, utcOffsetHours = 5.5 }) {
  const [y, mo, d] = dob.split('-').map(Number);
  const hasTime = Boolean(tob);
  const [hh, mm] = (tob || '12:00').split(':').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, hh, mm) - utcOffsetHours * 3600_000);
  const time = A.MakeTime(date);
  const later = A.MakeTime(new Date(date.getTime() + 86400_000)); // to detect retrograde motion
  const jd = julianDay(date);
  const ayanamsa = lahiriAyanamsa(jd);
  const sidereal = (tropical) => norm(tropical - ayanamsa);

  const planets = PLANETS.map((p) => {
    let lon;
    let retrograde = false;
    if (p.key === 'Rahu' || p.key === 'Ketu') {
      lon = sidereal(meanNode(jd) + (p.key === 'Ketu' ? 180 : 0));
      retrograde = true; // the nodes always move backwards
    } else {
      const now = tropicalLongitude(p.body, time);
      lon = sidereal(now);
      if (p.key !== 'Sun' && p.key !== 'Moon') {
        const diff = norm(tropicalLongitude(p.body, later) - now + 180) - 180; // signed daily motion
        retrograde = diff < 0;
      }
    }
    return { key: p.key, short: p.short, name: p.name, nameMr: p.nameMr, retrograde, ...describe(lon) };
  });

  const moon = planets.find((p) => p.key === 'Moon');
  const lagna = hasTime ? describe(sidereal(tropicalAscendant(time, where.lat, where.lon))) : null;
  const firstSign = lagna ? lagna.rashiNumber - 1 : moon.rashiNumber - 1; // Chandra Kundali without a time

  const houses = Array.from({ length: 12 }, (_, i) => {
    const sign = (firstSign + i) % 12;
    return {
      house: i + 1,
      rashiNumber: sign + 1,
      rashi: RASHIS[sign].name,
      rashiMr: RASHIS[sign].mr,
      planets: planets.filter((p) => p.rashiNumber - 1 === sign).map((p) => p.key),
    };
  });
  for (const p of planets) p.house = ((p.rashiNumber - 1 - firstSign + 12) % 12) + 1;

  return {
    chartType: lagna ? 'LAGNA' : 'CHANDRA',
    lagna,
    planets,
    houses,
    moonRashi: moon.rashi,
    moonRashiMr: moon.rashiMr,
    nakshatra: moon.nakshatra,
    pada: moon.pada,
    ayanamsa: Number(ayanamsa.toFixed(4)),
    place: where,
    input: { dob, tob: tob || null, place: where.name },
  };
}
