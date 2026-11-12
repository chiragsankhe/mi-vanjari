/**
 * Birthplaces → coordinates for the Lagna (ascendant), which depends on where you were born.
 * Palghar district first, then nearby and major Indian cities. Unknown places fall back to Palghar
 * (within the region the difference is tiny; far away it shifts the Lagna by a few degrees).
 * [name, latitude, longitude, ...aliases]
 */
export const PLACES_TABLE = [
  // Palghar district
  ['Palghar', 19.697, 72.765],
  ['Boisar', 19.803, 72.755],
  ['Dahanu', 19.972, 72.733, 'dahanu road'],
  ['Vasai', 19.391, 72.839, 'bassein', 'vasai road'],
  ['Virar', 19.456, 72.811],
  ['Nalasopara', 19.418, 72.819, 'nala sopara'],
  ['Jawhar', 19.912, 73.226],
  ['Mokhada', 19.933, 73.338],
  ['Wada', 19.653, 73.130],
  ['Vikramgad', 19.804, 73.084],
  ['Talasari', 20.133, 72.933],
  ['Saphale', 19.578, 72.820, 'safale'],
  ['Kelwa', 19.618, 72.740, 'kelwe', 'kelve'],
  ['Mahim', 19.660, 72.742],
  ['Satpati', 19.722, 72.700],
  ['Tarapur', 19.864, 72.683],
  ['Manor', 19.728, 72.912],
  ['Bordi', 20.102, 72.718],
  ['Gholvad', 20.072, 72.729],
  ['Chinchani', 19.900, 72.697],
  ['Vangaon', 19.884, 72.762],
  ['Kasa', 19.950, 72.890],
  ['Dahisar', 19.250, 72.865],
  // Mumbai region
  ['Mumbai', 19.076, 72.878, 'bombay'],
  ['Thane', 19.218, 72.978],
  ['Kalyan', 19.243, 73.130, 'dombivli'],
  ['Bhiwandi', 19.296, 73.063],
  ['Navi Mumbai', 19.033, 73.030, 'vashi', 'nerul', 'belapur'],
  ['Panvel', 18.989, 73.117],
  ['Mira Road', 19.281, 72.856, 'mira bhayandar', 'bhayandar'],
  ['Shahapur', 19.452, 73.327],
  // Maharashtra
  ['Pune', 18.520, 73.857, 'poona'],
  ['Nashik', 19.997, 73.790, 'nasik'],
  ['Chhatrapati Sambhajinagar', 19.876, 75.343, 'aurangabad'],
  ['Nagpur', 21.146, 79.088],
  ['Kolhapur', 16.705, 74.243],
  ['Ratnagiri', 16.990, 73.312],
  ['Satara', 17.680, 74.018],
  ['Ahilyanagar', 19.095, 74.749, 'ahmednagar'],
  ['Jalgaon', 21.004, 75.563],
  ['Dhule', 20.902, 74.775],
  ['Solapur', 17.660, 75.906],
  ['Nanded', 19.138, 77.321],
  ['Latur', 18.401, 76.560],
  ['Amravati', 20.932, 77.752],
  ['Akola', 20.702, 77.008],
  ['Alibag', 18.641, 72.872, 'alibaug'],
  // Gujarat & nearby
  ['Surat', 21.170, 72.831],
  ['Valsad', 20.599, 72.934],
  ['Vapi', 20.372, 72.905],
  ['Navsari', 20.951, 72.924],
  ['Umbergaon', 20.197, 72.750, 'umargam'],
  ['Silvassa', 20.273, 73.008],
  ['Daman', 20.397, 72.833],
  ['Ahmedabad', 23.023, 72.571],
  ['Vadodara', 22.307, 73.181, 'baroda'],
  ['Rajkot', 22.303, 70.802],
  // Rest of India
  ['Delhi', 28.614, 77.209, 'new delhi'],
  ['Jaipur', 26.912, 75.787],
  ['Udaipur', 24.585, 73.712],
  ['Jodhpur', 26.239, 73.024],
  ['Indore', 22.720, 75.858],
  ['Bhopal', 23.259, 77.413],
  ['Bengaluru', 12.972, 77.594, 'bangalore'],
  ['Hyderabad', 17.385, 78.487],
  ['Chennai', 13.083, 80.270, 'madras'],
  ['Kolkata', 22.573, 88.364, 'calcutta'],
  ['Goa', 15.491, 73.828, 'panaji', 'panjim'],
  ['Belagavi', 15.850, 74.498, 'belgaum'],
  ['Lucknow', 26.847, 80.947],
  ['Kanpur', 26.449, 80.331],
  ['Patna', 25.594, 85.137],
  ['Chandigarh', 30.733, 76.779],
  ['Mysuru', 12.296, 76.639, 'mysore'],
  ['Kochi', 9.931, 76.267, 'cochin'],
  ['Visakhapatnam', 17.687, 83.218, 'vizag'],
];

const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const INDEX = PLACES_TABLE.flatMap(([name, lat, lon, ...aliases]) => [name, ...aliases].map((k) => ({ key: clean(k), name, lat, lon })));
export const DEFAULT_PLACE = { name: 'Palghar', lat: 19.697, lon: 72.765 };

/** Best match for free text like "Boisar, Palghar" → { name, lat, lon, matched } (falls back to Palghar). */
export function findPlace(text) {
  const q = clean(text);
  if (!q) return { ...DEFAULT_PLACE, matched: false };
  // exact name/alias first; otherwise the place mentioned FIRST in the text ("Boisar, Palghar" → Boisar),
  // and the longer name when two start at the same spot ("Navi Mumbai" over "Mumbai")
  const exact = INDEX.find((p) => p.key === q);
  const padded = ` ${q} `;
  const hit =
    exact ||
    INDEX.map((p) => ({ ...p, at: padded.indexOf(` ${p.key} `) }))
      .filter((p) => p.at >= 0)
      .sort((a, b) => a.at - b.at || b.key.length - a.key.length)[0];
  return hit ? { name: hit.name, lat: hit.lat, lon: hit.lon, matched: true } : { ...DEFAULT_PLACE, matched: false };
}

/** Names for the place suggestions list in the form. */
export const PLACE_NAMES = PLACES_TABLE.map(([name]) => name);
