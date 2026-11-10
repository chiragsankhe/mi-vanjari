/**
 * Basic daily panchang for the Muhurat calendar hover card:
 * tithi + paksha, nakshatra and Moon rashi at sunrise, plus common observances
 * (Ekadashi, Purnima, Amavasya, Sankashti / Vinayaki Chaturthi, Pradosh).
 *
 * Uses the same Moon theory as the birth chart (Meeus ch. 47) and the Sun from Meeus ch. 25
 * (low-precision, ±0.01°). Values are taken at an average Palghar sunrise of 06:30 IST,
 * so a tithi that changes around dawn can differ from a printed panchang by a day — the UI says so.
 */
import { julianDay, lahiriAyanamsa, moonTropicalLongitude } from './engine.js';
import { NAKSHATRAS, RASHIS } from './tables.js';

const DEG = Math.PI / 180;
const norm = (x) => ((x % 360) + 360) % 360;

/** Sun's true (tropical) longitude, degrees — Meeus ch. 25. */
export function sunTropicalLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return norm(L0 + C);
}

const TITHIS = [
  ['Pratipada', 'प्रतिपदा'], ['Dwitiya', 'द्वितीया'], ['Tritiya', 'तृतीया'], ['Chaturthi', 'चतुर्थी'], ['Panchami', 'पंचमी'],
  ['Shashthi', 'षष्ठी'], ['Saptami', 'सप्तमी'], ['Ashtami', 'अष्टमी'], ['Navami', 'नवमी'], ['Dashami', 'दशमी'],
  ['Ekadashi', 'एकादशी'], ['Dwadashi', 'द्वादशी'], ['Trayodashi', 'त्रयोदशी'], ['Chaturdashi', 'चतुर्दशी'],
];

const WEEKDAYS = [
  ['Sunday', 'रविवार'], ['Monday', 'सोमवार'], ['Tuesday', 'मंगळवार'], ['Wednesday', 'बुधवार'],
  ['Thursday', 'गुरुवार'], ['Friday', 'शुक्रवार'], ['Saturday', 'शनिवार'],
];

/** Observances keyed by tithi index (0–29, 0 = Shukla Pratipada). */
const OBSERVANCES = {
  3: { name: 'Vinayaki Chaturthi', mr: 'विनायकी चतुर्थी' },
  10: { name: 'Ekadashi (fasting day)', mr: 'एकादशी' },
  12: { name: 'Pradosh', mr: 'प्रदोष' },
  14: { name: 'Purnima · full moon', mr: 'पौर्णिमा' },
  18: { name: 'Sankashti Chaturthi', mr: 'संकष्टी चतुर्थी' },
  25: { name: 'Ekadashi (fasting day)', mr: 'एकादशी' },
  27: { name: 'Pradosh', mr: 'प्रदोष' },
  29: { name: 'Amavasya · new moon', mr: 'अमावस्या' },
};

const SUNRISE_IST = { h: 6, m: 30 };

/** Panchang for one civil date (YYYY, 1-12, 1-31). */
export function dayPanchang(y, m, d) {
  const utcMs = Date.UTC(y, m - 1, d, SUNRISE_IST.h, SUNRISE_IST.m) - 5.5 * 3600_000;
  const jd = julianDay(new Date(utcMs));
  const moon = moonTropicalLongitude(jd);
  const sun = sunTropicalLongitude(jd);

  const tithiIndex = Math.floor(norm(moon - sun) / 12); // 0–29
  const shukla = tithiIndex < 15;
  const inPaksha = tithiIndex % 15;
  const [tName, tMr] = tithiIndex === 14 ? ['Purnima', 'पौर्णिमा'] : tithiIndex === 29 ? ['Amavasya', 'अमावस्या'] : TITHIS[inPaksha];

  const sidereal = norm(moon - lahiriAyanamsa(jd));
  const nak = NAKSHATRAS[Math.floor(sidereal / (360 / 27))];
  const rashi = RASHIS[Math.floor(sidereal / 30)];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return {
    date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    weekday: WEEKDAYS[weekday][0],
    weekdayMr: WEEKDAYS[weekday][1],
    tithi: { index: tithiIndex, name: tName, mr: tMr, number: inPaksha + 1 },
    paksha: shukla ? { name: 'Shukla paksha', mr: 'शुक्ल पक्ष', note: 'waxing moon' } : { name: 'Krishna paksha', mr: 'कृष्ण पक्ष', note: 'waning moon' },
    nakshatra: { name: nak.name, mr: nak.mr },
    moonRashi: { name: rashi.name, mr: rashi.mr, symbol: rashi.symbol },
    observances: OBSERVANCES[tithiIndex] ? [OBSERVANCES[tithiIndex]] : [],
  };
}

/** Every day of a month. */
export function monthPanchang(year, month) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => dayPanchang(year, month, i + 1));
}
