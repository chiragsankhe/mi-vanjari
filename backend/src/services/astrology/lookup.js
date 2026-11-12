/**
 * Birthplace search for the whole of India (village / taluka level).
 *  1. A curated list (Palghar district + nearby cities, with spellings) — instant, offline.
 *  2. Open-Meteo's geocoding API (GeoNames data, free, no key) for everywhere else — results are cached.
 * Each result: { id, name, taluka, district, state, country, lat, lon, tz, label, source }
 * Without any match the caller falls back to Palghar (a few km of error moves the Lagna by only minutes).
 */
import { DEFAULT_PLACE, PLACES_TABLE } from './places.js';

const clean = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const cache = new Map(); // query → { at, results }
const TTL = 24 * 3600_000;
const MAX_CACHE = 2000;

const palgharEnd = PLACES_TABLE.findIndex(([n]) => n === 'Mumbai'); // entries before Mumbai are the Palghar district list
const curated = PLACES_TABLE.map(([name, lat, lon, ...aliases], i) => ({ name, lat, lon, district: i < palgharEnd ? 'Palghar' : '', keys: [name, ...aliases].map(clean) }));

function fromCurated(q) {
  const out = [];
  for (const p of curated) {
    const hit = p.keys.some((k) => k.startsWith(q)) ? 2 : p.keys.some((k) => k.includes(q)) ? 1 : 0;
    if (hit) out.push({ hit, p });
  }
  return out
    .sort((a, b) => b.hit - a.hit || a.p.name.length - b.p.name.length)
    .slice(0, 6)
    .map(({ p }) => ({
      id: `c:${clean(p.name)}`,
      name: p.name,
      taluka: '',
      district: p.district,
      state: p.district ? 'Maharashtra' : '', // only labelled where it is certain (Palghar list)
      country: 'India',
      lat: p.lat,
      lon: p.lon,
      tz: 'Asia/Kolkata',
      source: 'list',
    }));
}

async function fromOpenMeteo(first, rest, signal) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(first)}&count=50&language=en&format=json&countryCode=IN`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  const data = await res.json();
  const words = rest.map(clean).filter(Boolean);
  return (data.results || [])
    .map((r) => ({
      id: `g:${r.id}`,
      name: r.name,
      taluka: r.admin3 || '',
      district: r.admin2 || '',
      state: r.admin1 || '',
      country: r.country || 'India',
      lat: r.latitude,
      lon: r.longitude,
      tz: r.timezone || 'Asia/Kolkata',
      pop: r.population || 0,
      source: 'geonames',
    }))
    // "Varangaon Jalgaon": the extra words must appear in the taluka / district / state
    .filter((r) => words.every((w) => clean(`${r.taluka} ${r.district} ${r.state}`).includes(w)));
}

const labelOf = (p) => [p.name, p.taluka && p.taluka !== p.name ? p.taluka : '', p.district, p.state].filter(Boolean).join(', ');

/** Search as you type. Never throws: on a network problem only the curated list is returned. */
export async function searchPlaces(text) {
  const q = clean(text);
  if (q.length < 2) return [];
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < TTL) return hit.results;

  const local = fromCurated(q);
  let remote = [];
  const [first, ...rest] = q.split(' ');
  if (first.length >= 2) {
    try {
      remote = await fromOpenMeteo(first, rest, AbortSignal.timeout(4000));
    } catch {
      /* offline / slow: the curated list still answers */
    }
  }
  // best first: exact names, then names starting with the text, then bigger places
  const rank = (p) => (clean(p.name) === q ? 3 : clean(p.name).startsWith(q) ? 2 : 1);
  const merged = [...local, ...remote.sort((a, b) => rank(b) - rank(a) || (b.pop || 0) - (a.pop || 0))];
  // drop near-duplicates: same name within ~3 km (e.g. a curated entry and the same place from the database)
  const out = [];
  for (const p of merged) {
    if (out.some((o) => clean(o.name) === clean(p.name) && Math.abs(o.lat - p.lat) < 0.03 && Math.abs(o.lon - p.lon) < 0.03)) continue;
    out.push({ ...p, label: labelOf(p) });
    if (out.length >= 10) break;
  }
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  if (remote.length || local.length) cache.set(q, { at: Date.now(), results: out });
  return out;
}

/**
 * Coordinates for a birth: explicit lat/lon (a chosen suggestion) win; otherwise the typed text is looked up;
 * otherwise Palghar. `tz` is an IANA time zone name.
 */
export async function resolveBirthPlace({ place, lat, lon, tz }) {
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { name: place || 'Chosen place', lat, lon, tz: tz || 'Asia/Kolkata', matched: true };
  if (place) {
    const [top] = await searchPlaces(place);
    if (top) return { name: top.label || top.name, lat: top.lat, lon: top.lon, tz: top.tz, matched: true };
  }
  return { ...DEFAULT_PLACE, tz: 'Asia/Kolkata', matched: false };
}

/** UTC offset (hours) of an IANA time zone at a local date/time — handles zones with daylight saving. */
export function utcOffsetHours(tz, dob, tob) {
  if (!tz || tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 5.5;
  try {
    const [y, mo, d] = dob.split('-').map(Number);
    const [hh, mm] = (tob || '12:00').split(':').map(Number);
    const guess = new Date(Date.UTC(y, mo - 1, d, hh, mm));
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(guess).find((p) => p.type === 'timeZoneName')?.value || 'GMT+05:30';
    const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 5.5;
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) + Number(m[3] || 0) / 60);
  } catch {
    return 5.5;
  }
}
