/**
 * Reference data every installation needs (no people, no demo content).
 * Used by prisma/seed.js (development demo) and prisma/starter.js (safe for the live database).
 */

export const nameKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Wedding service categories with their subcategories (slugs of the first six are kept from the original list). */
export const SERVICE_TREE = [
  { slug: 'wedding-halls', name: 'Wedding Venues & Accommodation', nameMr: 'मंगल कार्यालय आणि निवास', description: 'Halls, lawns, resorts and guest houses', icon: 'hall', legacy: 'Wedding Halls',
    subs: ['Marriage Hall', 'Banquet Hall', 'Wedding Lawn', 'Garden', 'Resort', 'Hotel', 'Guest House', 'Community Hall'] },
  { slug: 'dj-music', name: 'DJ, Music & Entertainment', nameMr: 'डीजे, संगीत आणि मनोरंजन', description: 'DJ, bands, banjo, dhol and anchors', icon: 'music', legacy: 'Music & DJ',
    subs: ['DJ Sound System', 'Band Party', 'Banjo Party', 'Dhol Tasha Pathak', 'Nashik Dhol', 'Lezim', 'Orchestra', 'Live Singers', 'Anchors'] },
  { slug: 'pandit-rituals', name: 'Pandit & Wedding Rituals', nameMr: 'पंडित आणि विधी', description: 'Pandit, pooja, kundali and muhurat guidance', icon: 'zodiac',
    subs: ['Brahmin', 'Pandit', 'Pooja Services', 'Kundali Matching', 'Horoscope', 'Muhurat Consultation', 'Havan', 'Pooja Materials'] },
  { slug: 'catering', name: 'Catering & Food', nameMr: 'केटरिंग आणि जेवण', description: 'Traditional and modern menus', icon: 'food', legacy: 'Catering',
    subs: ['Wedding Caterers', 'Maharashtrian Food', 'Veg Catering', 'Non-Veg Catering', 'Sweet Makers', 'Halwai', 'Live Food Counters', 'Food Stalls'] },
  { slug: 'photography', name: 'Photography & Videography', nameMr: 'फोटोग्राफी आणि व्हिडिओ', description: 'Stories captured beautifully', icon: 'camera', legacy: 'Photography',
    subs: ['Wedding Photographer', 'Videographer', 'Pre-Wedding Shoot', 'Cinematic Video', 'Drone Photography', 'Wedding Albums', 'Live Streaming'] },
  { slug: 'decoration', name: 'Wedding Decoration & Mandap', nameMr: 'सजावट आणि मंडप', description: 'Flowers, mandap, stage and lights', icon: 'flower', legacy: 'Decoration',
    subs: ['Mandap Decoration', 'Stage Decoration', 'Flower Decoration', 'Entrance Decoration', 'Lighting', 'Haldi Decoration', 'Mehendi Decoration', 'Reception Decoration'] },
  { slug: 'makeup', name: 'Makeup, Beauty & Grooming', nameMr: 'मेकअप, ब्युटी आणि ग्रूमिंग', description: 'Bridal and groom styling experts', icon: 'sparkle', legacy: 'Makeup Artists',
    subs: ['Bridal Makeup', 'Groom Makeup', 'Makeup Artist', 'Hair Stylist', 'Mehendi Artist', 'Beauty Parlour', 'Saree Draping', 'Nail Art'] },
  { slug: 'clothes-jewellery', name: 'Wedding Clothes & Jewellery', nameMr: 'लग्नाचे कपडे आणि दागिने', description: 'Lehenga, sarees, sherwani and jewellery', icon: 'heart',
    subs: ['Bridal Lehenga', 'Wedding Sarees', 'Sherwani', 'Wedding Suits', 'Traditional Jewellery', 'Artificial Jewellery', 'Pheta', 'Dress Rental'] },
  { slug: 'transportation', name: 'Wedding Transportation', nameMr: 'लग्नाची वाहतूक', description: 'Cars, buses, ghodi and baraat vehicles', icon: 'map',
    subs: ['Wedding Car Rental', 'Luxury Cars', 'Decorated Cars', 'Bus Rental', 'Tempo Traveller', 'Horse/Ghodi', 'Buggy'] },
  { slug: 'invitations-printing', name: 'Wedding Invitations & Printing', nameMr: 'निमंत्रण पत्रिका आणि छपाई', description: 'Cards, digital invites, banners and gifts', icon: 'mail',
    subs: ['Wedding Invitation Cards', 'Digital Invitations', 'WhatsApp Video Invitations', 'Wedding Banners', 'Flex Printing', 'Welcome Boards', 'Customized Gifts'] },
  { slug: 'planning-management', name: 'Wedding Planning & Management', nameMr: 'वेडिंग प्लॅनिंग आणि व्यवस्थापन', description: 'Planners, coordinators and full packages', icon: 'tent',
    subs: ['Wedding Planner', 'Event Manager', 'Wedding Coordinator', 'Guest Management', 'Destination Wedding Planning', 'Complete Wedding Packages'] },
  { slug: 'other-services', name: 'Other Wedding Services', nameMr: 'इतर लग्न सेवा', description: 'Gifts, fireworks, rentals, security and more', icon: 'grid',
    subs: ['Flower Jewellery', 'Wedding Gifts', 'Return Gifts', 'Fireworks', 'Generator', 'Sound System', 'Chairs & Tables Rental', 'AC/Cooler Rental', 'Security', 'Valet Parking', 'Cleaning Services'] },
];

/** Plain category rows (what a fresh install creates). */
export const CATEGORIES = SERVICE_TREE.map(({ subs, legacy, ...c }, i) => ({ ...c, key: nameKey(c.name), sortOrder: i + 1 }));

/**
 * Creates any missing category / subcategory and renames the original six categories once
 * (only while they still carry their old name, so a name the admin changed is never overwritten).
 * Safe to run on every deploy; never deletes anything.
 */
export async function syncServiceCategories(prisma) {
  const out = { categories: 0, subcategories: 0 };
  for (const [i, node] of SERVICE_TREE.entries()) {
    const { subs, legacy, ...c } = node;
    const row = { ...c, key: nameKey(c.name), sortOrder: i + 1 };
    let cat = await prisma.serviceCategory.findUnique({ where: { slug: c.slug } });
    if (!cat) {
      cat = await prisma.serviceCategory.create({ data: row });
      out.categories++;
    } else if (legacy && cat.name === legacy) {
      cat = await prisma.serviceCategory.update({ where: { id: cat.id }, data: { name: row.name, nameMr: row.nameMr, description: row.description, key: row.key, icon: row.icon, sortOrder: row.sortOrder } });
    }
    for (const [j, name] of subs.entries()) {
      const key = nameKey(name);
      const have = await prisma.serviceSubcategory.findUnique({ where: { categoryId_key: { categoryId: cat.id, key } }, select: { id: true } });
      if (have) continue;
      await prisma.serviceSubcategory.create({ data: { categoryId: cat.id, name, key, sortOrder: j + 1 } });
      out.subcategories++;
    }
  }
  return out;
}

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
