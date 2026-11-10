/**
 * Reference data every installation needs (no people, no demo content).
 * Used by prisma/seed.js (development demo) and prisma/starter.js (safe for the live database).
 */

export const CATEGORIES = [
  { slug: 'dj-music', name: 'Music & DJ', nameMr: 'संगीत आणि डीजे', description: 'Live bands, DJ, banjo and sound', icon: 'music', sortOrder: 1 },
  { slug: 'wedding-halls', name: 'Wedding Halls', nameMr: 'मंगल कार्यालय', description: 'Venues across Palghar', icon: 'hall', sortOrder: 2 },
  { slug: 'makeup', name: 'Makeup Artists', nameMr: 'मेकअप आर्टिस्ट', description: 'Bridal styling experts', icon: 'sparkle', sortOrder: 3 },
  { slug: 'catering', name: 'Catering', nameMr: 'केटरिंग', description: 'Traditional and modern menus', icon: 'food', sortOrder: 4 },
  { slug: 'photography', name: 'Photography', nameMr: 'फोटोग्राफी', description: 'Stories captured beautifully', icon: 'camera', sortOrder: 5 },
  { slug: 'decoration', name: 'Decoration', nameMr: 'सजावट', description: 'Flowers, mandap and lights', icon: 'flower', sortOrder: 6 },
];

export const MUHURAT = [
  // Indicative vivah muhurat dates — admins should verify each year against a trusted local panchang.
  ['2026-11-21', 'VIVAH'], ['2026-11-24', 'VIVAH'], ['2026-11-25', 'VIVAH'], ['2026-11-26', 'VIVAH'],
  ['2026-12-02', 'VIVAH'], ['2026-12-03', 'VIVAH'], ['2026-12-04', 'VIVAH'], ['2026-12-05', 'VIVAH'], ['2026-12-06', 'VIVAH'], ['2026-12-11', 'VIVAH'],
  ['2027-01-23', 'VIVAH'], ['2027-01-25', 'VIVAH'], ['2027-01-30', 'VIVAH'],
  ['2027-02-04', 'VIVAH'], ['2027-02-06', 'VIVAH'], ['2027-02-12', 'VIVAH'], ['2027-02-19', 'VIVAH'], ['2027-02-21', 'VIVAH'],
  ['2027-03-05', 'VIVAH'], ['2027-03-09', 'VIVAH'], ['2027-04-20', 'VIVAH'], ['2027-04-26', 'VIVAH'],
  ['2027-05-03', 'VIVAH'], ['2027-05-12', 'VIVAH'], ['2027-05-17', 'VIVAH'], ['2027-05-23', 'VIVAH'],
  ['2026-11-19', 'GRIHA_PRAVESH'], ['2026-12-09', 'GRIHA_PRAVESH'], ['2027-02-11', 'GRIHA_PRAVESH'], ['2027-04-23', 'GRIHA_PRAVESH'],
  ['2026-11-22', 'SAKHARPUDA'], ['2027-01-28', 'SAKHARPUDA'], ['2027-02-15', 'SAKHARPUDA'],
];
export const MUHURAT_TITLES = { VIVAH: 'Vivah muhurat · विवाह मुहूर्त', GRIHA_PRAVESH: 'Griha pravesh · गृहप्रवेश', SAKHARPUDA: 'Sakharpuda · साखरपुडा' };
