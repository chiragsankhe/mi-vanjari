/**
 * Reference tables for Vedic (sidereal) astrology.
 * Index 0 of RASHIS = Mesh (Aries); index 0 of NAKSHATRAS = Ashwini.
 */

export const RASHIS = [
  { key: 'mesh', name: 'Mesh', en: 'Aries', mr: 'मेष', symbol: '♈', lord: 'Mars', element: 'Fire', color: 'Red', varna: 3, vashya: 'CHATUSHPAD' },
  { key: 'vrishabh', name: 'Vrishabh', en: 'Taurus', mr: 'वृषभ', symbol: '♉', lord: 'Venus', element: 'Earth', color: 'White', varna: 2, vashya: 'CHATUSHPAD' },
  { key: 'mithun', name: 'Mithun', en: 'Gemini', mr: 'मिथुन', symbol: '♊', lord: 'Mercury', element: 'Air', color: 'Green', varna: 1, vashya: 'MANAV' },
  { key: 'kark', name: 'Kark', en: 'Cancer', mr: 'कर्क', symbol: '♋', lord: 'Moon', element: 'Water', color: 'Silver', varna: 4, vashya: 'JALCHAR' },
  { key: 'simha', name: 'Simha', en: 'Leo', mr: 'सिंह', symbol: '♌', lord: 'Sun', element: 'Fire', color: 'Gold', varna: 3, vashya: 'VANCHAR' },
  { key: 'kanya', name: 'Kanya', en: 'Virgo', mr: 'कन्या', symbol: '♍', lord: 'Mercury', element: 'Earth', color: 'Green', varna: 2, vashya: 'MANAV' },
  { key: 'tula', name: 'Tula', en: 'Libra', mr: 'तूळ', symbol: '♎', lord: 'Venus', element: 'Air', color: 'Light blue', varna: 1, vashya: 'MANAV' },
  { key: 'vrishchik', name: 'Vrishchik', en: 'Scorpio', mr: 'वृश्चिक', symbol: '♏', lord: 'Mars', element: 'Water', color: 'Maroon', varna: 4, vashya: 'KEET' },
  { key: 'dhanu', name: 'Dhanu', en: 'Sagittarius', mr: 'धनु', symbol: '♐', lord: 'Jupiter', element: 'Fire', color: 'Yellow', varna: 3, vashya: 'MANAV', vashya2: 'CHATUSHPAD' },
  { key: 'makar', name: 'Makar', en: 'Capricorn', mr: 'मकर', symbol: '♑', lord: 'Saturn', element: 'Earth', color: 'Dark blue', varna: 2, vashya: 'CHATUSHPAD', vashya2: 'JALCHAR' },
  { key: 'kumbh', name: 'Kumbh', en: 'Aquarius', mr: 'कुंभ', symbol: '♒', lord: 'Saturn', element: 'Air', color: 'Electric blue', varna: 1, vashya: 'MANAV' },
  { key: 'meen', name: 'Meen', en: 'Pisces', mr: 'मीन', symbol: '♓', lord: 'Jupiter', element: 'Water', color: 'Sea green', varna: 4, vashya: 'JALCHAR' },
];

export const VARNA_NAMES = { 4: 'Brahmin', 3: 'Kshatriya', 2: 'Vaishya', 1: 'Shudra' };

// gana: D = Deva, M = Manushya, R = Rakshasa | nadi: A = Adi, M = Madhya, N = Antya
export const NAKSHATRAS = [
  { name: 'Ashwini', mr: 'अश्विनी', lord: 'Ketu', gana: 'D', yoni: 'Horse', nadi: 'A' },
  { name: 'Bharani', mr: 'भरणी', lord: 'Venus', gana: 'M', yoni: 'Elephant', nadi: 'M' },
  { name: 'Krittika', mr: 'कृत्तिका', lord: 'Sun', gana: 'R', yoni: 'Sheep', nadi: 'N' },
  { name: 'Rohini', mr: 'रोहिणी', lord: 'Moon', gana: 'M', yoni: 'Serpent', nadi: 'N' },
  { name: 'Mrigashira', mr: 'मृगशीर्ष', lord: 'Mars', gana: 'D', yoni: 'Serpent', nadi: 'M' },
  { name: 'Ardra', mr: 'आर्द्रा', lord: 'Rahu', gana: 'M', yoni: 'Dog', nadi: 'A' },
  { name: 'Punarvasu', mr: 'पुनर्वसू', lord: 'Jupiter', gana: 'D', yoni: 'Cat', nadi: 'A' },
  { name: 'Pushya', mr: 'पुष्य', lord: 'Saturn', gana: 'D', yoni: 'Sheep', nadi: 'M' },
  { name: 'Ashlesha', mr: 'आश्लेषा', lord: 'Mercury', gana: 'R', yoni: 'Cat', nadi: 'N' },
  { name: 'Magha', mr: 'मघा', lord: 'Ketu', gana: 'R', yoni: 'Rat', nadi: 'N' },
  { name: 'Purva Phalguni', mr: 'पूर्वा फाल्गुनी', lord: 'Venus', gana: 'M', yoni: 'Rat', nadi: 'M' },
  { name: 'Uttara Phalguni', mr: 'उत्तरा फाल्गुनी', lord: 'Sun', gana: 'M', yoni: 'Cow', nadi: 'A' },
  { name: 'Hasta', mr: 'हस्त', lord: 'Moon', gana: 'D', yoni: 'Buffalo', nadi: 'A' },
  { name: 'Chitra', mr: 'चित्रा', lord: 'Mars', gana: 'R', yoni: 'Tiger', nadi: 'M' },
  { name: 'Swati', mr: 'स्वाती', lord: 'Rahu', gana: 'D', yoni: 'Buffalo', nadi: 'N' },
  { name: 'Vishakha', mr: 'विशाखा', lord: 'Jupiter', gana: 'R', yoni: 'Tiger', nadi: 'N' },
  { name: 'Anuradha', mr: 'अनुराधा', lord: 'Saturn', gana: 'D', yoni: 'Deer', nadi: 'M' },
  { name: 'Jyeshtha', mr: 'ज्येष्ठा', lord: 'Mercury', gana: 'R', yoni: 'Deer', nadi: 'A' },
  { name: 'Mula', mr: 'मूळ', lord: 'Ketu', gana: 'R', yoni: 'Dog', nadi: 'A' },
  { name: 'Purva Ashadha', mr: 'पूर्वाषाढा', lord: 'Venus', gana: 'M', yoni: 'Monkey', nadi: 'M' },
  { name: 'Uttara Ashadha', mr: 'उत्तराषाढा', lord: 'Sun', gana: 'M', yoni: 'Mongoose', nadi: 'N' },
  { name: 'Shravana', mr: 'श्रवण', lord: 'Moon', gana: 'D', yoni: 'Monkey', nadi: 'N' },
  { name: 'Dhanishta', mr: 'धनिष्ठा', lord: 'Mars', gana: 'R', yoni: 'Lion', nadi: 'M' },
  { name: 'Shatabhisha', mr: 'शततारका', lord: 'Rahu', gana: 'R', yoni: 'Horse', nadi: 'A' },
  { name: 'Purva Bhadrapada', mr: 'पूर्वा भाद्रपदा', lord: 'Jupiter', gana: 'M', yoni: 'Lion', nadi: 'A' },
  { name: 'Uttara Bhadrapada', mr: 'उत्तरा भाद्रपदा', lord: 'Saturn', gana: 'M', yoni: 'Cow', nadi: 'M' },
  { name: 'Revati', mr: 'रेवती', lord: 'Mercury', gana: 'D', yoni: 'Elephant', nadi: 'N' },
];

export const GANA_NAMES = { D: 'Deva', M: 'Manushya', R: 'Rakshasa' };
export const NADI_NAMES = { A: 'Adi', M: 'Madhya', N: 'Antya' };

/** Natural planetary friendships (Parashara). */
export const PLANET_RELATIONS = {
  Sun: { friends: ['Moon', 'Mars', 'Jupiter'], enemies: ['Venus', 'Saturn'] },
  Moon: { friends: ['Sun', 'Mercury'], enemies: [] },
  Mars: { friends: ['Sun', 'Moon', 'Jupiter'], enemies: ['Mercury'] },
  Mercury: { friends: ['Sun', 'Venus'], enemies: ['Moon'] },
  Jupiter: { friends: ['Sun', 'Moon', 'Mars'], enemies: ['Mercury', 'Venus'] },
  Venus: { friends: ['Mercury', 'Saturn'], enemies: ['Sun', 'Moon'] },
  Saturn: { friends: ['Mercury', 'Venus'], enemies: ['Sun', 'Moon', 'Mars'] },
};

/** Boy (row) × Girl (column) Vashya points. */
export const VASHYA_ORDER = ['CHATUSHPAD', 'MANAV', 'JALCHAR', 'VANCHAR', 'KEET'];
export const VASHYA_POINTS = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];

/**
 * Yoni compatibility, 14 × 14 (symmetric). Order: Horse, Elephant, Sheep, Serpent, Dog, Cat, Rat,
 * Cow, Buffalo, Tiger, Deer, Monkey, Mongoose, Lion. Diagonal = 4 (same yoni); the seven 0s are the
 * sworn enemies: Horse–Buffalo, Elephant–Lion, Sheep–Monkey, Serpent–Mongoose, Dog–Deer, Cat–Rat, Cow–Tiger.
 */
export const YONI_ORDER = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
export const YONI_POINTS = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 2],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 2, 2, 2, 4],
];

/** Boy gana (row) × Girl gana (column) points: D, M, R. */
export const GANA_POINTS = {
  D: { D: 6, M: 6, R: 1 },
  M: { D: 5, M: 6, R: 0 },
  R: { D: 1, M: 0, R: 6 },
};
