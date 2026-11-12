import { prisma } from '../lib/prisma.js';

/**
 * Sample content — so a new visitor sees how the site looks when it is busy.
 *
 * Honest by design:
 *  • everything is tagged "Sample" in the site (Profile.isDemo)
 *  • people have illustrated avatars, never real photos; names and stories are made up
 *  • sample profiles cannot be messaged or followed, and have no phone numbers
 *  • there are NO matrimony profiles (nobody should think a real match exists)
 *  • sample numbers are never counted in the public member statistics
 *  • the admin can add or remove all of it with one click (Admin → Settings)
 *
 * Everything belongs to users whose email ends with SAMPLE_DOMAIN; removal deletes exactly those users
 * (profiles, posts, listings and achievements go with them). Real accounts are never touched.
 */
export const SAMPLE_DOMAIN = '@sample.mivanjari.invalid';

const photo = (id, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const IMG = {
  cows: '1500595046743-cd271d694d30',
  field: '1500382017468-9049fed747ef',
  corn: '1625246333195-78d9c38ad449',
  groceries: '1542838132-92c53300491e',
  vegMarket: '1488459716781-31db52582fe9',
  truck: '1601584115197-04ecc0da31d7',
  construction: '1504307651254-35680f356dfd',
  books: '1503676260728-1c00da094a0b',
  study: '1522202176988-66273c2fd55f',
  team: '1521737604893-d14cc237f11d',
  buffet: '1555244162-803834f70033',
  plated: '1414235077428-338989a2e8c0',
  camera: '1452587925148-ce544e77e70d',
  camera2: '1516035069371-29a1b244cc32',
  decor: '1511795409834-ef04bbd61622',
  hall: '1464366400600-7168b8af9bc3',
  flowers: '1465495976277-4387d4b0b4c6',
  concert: '1470229722913-7c0e2dbbafd3',
  concert2: '1516450360452-9312f5e86fc7',
};
const avatar = (seed, bg) => `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&scale=85`;
const BG = ['ffd5dc', 'ffdfbf', 'c0aede', 'd1d4f9', 'b6e3f4', 'e8d5b5'];

// key, name, gender, city, village, occupation, birth year, bio
const MEMBERS = [
  ['sunita', 'Sunita Patil', 'FEMALE', 'Palghar', 'Kelve', 'School teacher', 1988, 'Teaching maths to village children for 12 years. Love rangoli and Sunday family lunches.'],
  ['rahul', 'Rahul Gaikwad', 'MALE', 'Boisar', 'Tarapur', 'Civil engineer', 1990, 'Builds homes for a living. Cricket on weekends with the Boisar boys.'],
  ['pooja', 'Pooja Shinde', 'FEMALE', 'Vasai', 'Nalasopara', 'Staff nurse', 1993, 'Nursing is service. Happy to guide girls who want to study nursing.'],
  ['amit', 'Amit Jadhav', 'MALE', 'Dahanu', 'Gholvad', 'Dairy farmer', 1985, 'Third-generation dairy farmer. Fresh milk, ghee and a lot of patience.'],
  ['kavita', 'Kavita More', 'FEMALE', 'Talasari', 'Kochai', 'Shop & decoration business', 1991, 'Runs a small store and does wedding mandap flowers on the side.'],
  ['santosh', 'Santosh Pawar', 'MALE', 'Wada', 'Kudus', 'Transport & hall owner', 1983, 'Trucks, a mangal karyalay and too many phone calls.'],
  ['rekha', 'Rekha Kale', 'FEMALE', 'Jawhar', 'Vikramgad', 'Homemaker & Warli artist', 1987, 'Warli paintings, village stories and monsoon walks.'],
  ['nilesh', 'Nilesh Bhoir', 'MALE', 'Mumbai', 'Virar', 'Software developer', 1994, 'Writes code in Mumbai, always up for a trek to Kalsubai.'],
  ['snehal', 'Snehal Chavan', 'FEMALE', 'Pune', 'Mokhada', 'Chartered accountant', 1992, 'First CA in the family. Believes every girl should finish her education.'],
  ['prakash', 'Prakash Waghmare', 'MALE', 'Nashik', 'Peth', 'Catering owner', 1980, 'Feeding weddings and functions since 2008. Misal is my speciality.'],
  ['manisha', 'Manisha Dhumal', 'FEMALE', 'Thane', 'Shahapur', 'Wedding photographer', 1991, 'Candid wedding stories. Camera in one hand, chai in the other.'],
  ['vijay', 'Vijay Kharat', 'MALE', 'Palghar', 'Mahim', 'Sound & DJ, agro centre', 1989, 'Sound systems for every function, and seeds & fertilisers for every farm.'],
];

// owner key, name, category, description, location, photos
const BUSINESSES = [
  ['amit', 'Jadhav Dairy Farm & Milk Products', 'Dairy & Poultry', 'Fresh cow and buffalo milk, ghee, paneer and dahi from our own farm, delivered every morning.', 'Dahanu', [IMG.cows, IMG.field]],
  ['santosh', 'Pawar Transport & Logistics', 'Transport', 'Goods transport across Maharashtra and Gujarat. Trucks of all sizes, on-time delivery.', 'Wada', [IMG.truck]],
  ['kavita', 'More Kirana & General Store', 'Shop & Retail', 'Groceries, household items and daily needs. Home delivery within Talasari.', 'Talasari', [IMG.groceries, IMG.vegMarket]],
  ['rahul', 'Gaikwad Construction & Interiors', 'Construction', 'Houses, shops and renovations with honest estimates and transparent progress updates.', 'Boisar', [IMG.construction]],
  ['sunita', 'Patil Study Circle', 'Education', 'Evening tuitions for classes 8–10: maths, science and English. Small batches, personal attention.', 'Palghar', [IMG.books, IMG.study]],
  ['nilesh', 'Bhoir Web & App Studio', 'IT & Services', 'Websites, apps and digital marketing for small businesses and shops.', 'Mumbai', [IMG.team]],
  ['vijay', 'Kharat Agro Centre', 'Agriculture', 'Quality seeds, fertilisers and crop-care advice for farmers around Palghar.', 'Palghar', [IMG.corn, IMG.field]],
  ['prakash', 'Waghmare Misal & Snacks', 'Food & Catering', 'Famous misal pav, vada pav and snacks. Bulk orders for functions and offices.', 'Nashik', [IMG.plated]],
];

// owner key, name, category slug, description, location, priceFrom, years, photos, featured
const SERVICES = [
  ['prakash', 'Waghmare Catering – Weddings & Functions', 'catering', 'Traditional Maharashtrian wedding menus, live counters and sweets. Hygienic kitchen, trained serving staff. Tasting before you book.', 'Nashik, Palghar, Thane', 350, 12, [IMG.buffet, IMG.plated], true],
  ['manisha', 'Manisha Dhumal Photography', 'photography', 'Candid wedding photography and cinematic videos. Pre-wedding shoots, albums and same-week sneak peeks.', 'Thane, Mumbai, Palghar', 25000, 8, [IMG.camera, IMG.camera2], true],
  ['vijay', 'Kharat Sound & DJ', 'dj-music', 'Powerful sound, lights and DJ for sangeet, haldi and baraat. Banjo and dhol groups arranged on request.', 'Palghar, Boisar, Vasai', 15000, 6, [IMG.concert, IMG.concert2], false],
  ['kavita', 'Kavita Mandap & Floral Decoration', 'decoration', 'Fresh-flower mandaps, stage and entrance decoration, with traditional and modern themes.', 'Talasari, Dahanu, Palghar', 20000, 10, [IMG.decor, IMG.flowers], true],
  ['santosh', 'Pawar Mangal Karyalay', 'wedding-halls', 'Spacious hall with dining area, bridal rooms and parking for 200 vehicles. Generator backup.', 'Wada', 40000, 15, [IMG.hall, IMG.decor], false],
];

// owner key, type, name, details
const ACHIEVEMENTS = [
  ['sunita', 'ACADEMIC', 'Sakshi Patil', { schoolName: 'Zilla Parishad School, Palghar', grade: '10th', percentage: 94.2, year: 2025, description: 'Topped her school in the 10th board exams and wants to become a doctor.' }],
  ['rahul', 'ACADEMIC', 'Omkar Gaikwad', { schoolName: 'Junior College, Boisar', grade: '12th', stream: 'Science', percentage: 91.5, year: 2025, description: 'Scored 91.5% in HSC Science and cleared the engineering entrance exam.' }],
  ['pooja', 'ACADEMIC', 'Ankita Shinde', { schoolName: 'Vasai Girls High School', grade: '10th', percentage: 89.8, year: 2025, description: 'Won the district-level science exhibition and scored 89.8% in the board exams.' }],
  ['amit', 'ACADEMIC', 'Tejas Jadhav', { schoolName: 'Dahanu High School', grade: '10th', percentage: 92.0, year: 2024, description: 'A dairy farmer’s son who studies by the cow shed lamp — 92% in SSC.' }],
  ['snehal', 'PROFESSIONAL', 'CA Snehal Chavan', { role: 'Chartered Accountant', company: 'Own practice', city: 'Pune', description: 'Cleared CA in the first attempt and now helps small businesses with accounts and tax.' }],
  ['nilesh', 'PROFESSIONAL', 'Nilesh Bhoir', { role: 'Senior Software Engineer', company: 'A product company', city: 'Mumbai', description: 'Mentors students from the community who want to start a tech career.' }],
  ['pooja', 'PROFESSIONAL', 'Pooja Shinde', { role: 'Staff Nurse', company: 'District hospital', city: 'Vasai', description: 'Recognised for 5 years of dedicated patient care.' }],
  ['rahul', 'PROFESSIONAL', 'Er. Rahul Gaikwad', { role: 'Civil Engineer', company: 'Gaikwad Construction', city: 'Boisar', description: 'Started with a single site; now employs 20 people from nearby villages.' }],
];

// author key, text, image key, days ago, likes
const POSTS = [
  ['amit', 'Tip for fellow dairy farmers: clean water and regular deworming make a visible difference to milk yield. Happy to share what worked for our herd. 🐄', 'cows', 1, 18],
  ['sunita', 'Free evening classes for 8th–10th students in Palghar this month — maths & science. Please spread the word! 📚\nमोफत संध्याकाळचे वर्ग — कृपया पुढे पाठवा.', 'study', 2, 24],
  ['prakash', 'Wedding season prep: book your caterer at least 2 months ahead, and always do a tasting first! 🍛', 'buffet', 3, 14],
  ['nilesh', 'Anyone from our community working in or wanting to join IT? Ping me — happy to guide on resumes and interviews.', 'team', 4, 21],
  ['snehal', 'Proud of our girls scoring top ranks this year. Keep studying, keep shining! ✨\nआपल्या मुलींचा अभिमान आहे.', 'books', 5, 33],
  ['manisha', 'Weddings are about emotions. Candid moments beat posed photos every time. A few frames from my camera bag 📷', 'camera', 6, 16],
  ['rekha', 'सकाळचा गार वारा आणि शेतातला सूर्योदय... गावाची खूप आठवण आली 🌾', 'field', 7, 29],
  ['rahul', 'Planning a new house? Finalise electrical and plumbing layouts before plastering — it saves a lot of money later. 🏠', 'construction', 9, 12],
  ['kavita', 'Mandap flowers stay fresh till the last ritual if they are cold-stored and picked up late morning. 🌸', 'decor', 10, 15],
  ['vijay', 'Sound check done for tonight’s function! Music brings everyone together. 🎶', 'concert', 12, 11],
  ['pooja', 'Thinking of organising a blood donation camp for our community this winter. Who would like to help? 🩸', null, 14, 27],
  ['santosh', 'Planning a community trip or a family function? I can arrange vehicles for groups of 30+. Message me.', null, 17, 8],
];

const daysAgo = (d, extraMin = 0) => new Date(Date.now() - d * 86400_000 - extraMin * 60_000);
const emailOf = (key) => `${key}${SAMPLE_DOMAIN}`;

export async function sampleStatus() {
  const where = { user: { email: { endsWith: SAMPLE_DOMAIN } } };
  const [members, posts, businesses, services, achievements] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: SAMPLE_DOMAIN } } }),
    prisma.post.count({ where: { author: { email: { endsWith: SAMPLE_DOMAIN } } } }),
    prisma.business.count({ where }),
    prisma.serviceProvider.count({ where }),
    prisma.achievement.count({ where }),
  ]);
  return { members, posts, businesses, services, achievements, present: members > 0 };
}

/** Adds (or tops up) the sample content. Safe to run twice — nothing is duplicated. */
export async function addSampleContent() {
  const ids = {};
  for (const [i, [key, name, gender, city, village, occupation, year, bio]] of MEMBERS.entries()) {
    const email = emailOf(key);
    const url = avatar(name, BG[i % BG.length]);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        role: 'USER',
        intents: ['COMMUNITY'],
        lastActiveAt: daysAgo(i % 5),
        createdAt: daysAgo(40 - i * 2),
        profile: {
          create: {
            fullName: name,
            gender,
            currentCity: city,
            currentState: 'Maharashtra',
            nativeVillage: village,
            occupation,
            bio,
            dateOfBirth: new Date(`${year}-0${(i % 9) + 1}-1${i % 9}`),
            profilePhotoUrl: url,
            profilePhotoBlurUrl: url,
            isMatrimonial: false, // sample profiles never appear in matrimony
            accountType: 'PUBLIC',
            isDemo: true,
            createdAt: daysAgo(40 - i * 2),
          },
        },
      },
      select: { id: true },
    });
    ids[key] = user.id;
  }

  const have = async (model, where) => (await prisma[model].count({ where })) > 0;

  let posts = 0;
  for (const [i, [key, content, img, days, likes]] of POSTS.entries()) {
    if (await have('post', { authorId: ids[key], content })) continue;
    await prisma.post.create({ data: { authorId: ids[key], content, imageUrl: img ? photo(IMG[img]) : null, likeCount: likes, createdAt: daysAgo(days, i * 37) } });
    posts++;
  }

  let businesses = 0;
  for (const [i, [key, name, category, description, location, photos]] of BUSINESSES.entries()) {
    if (await have('business', { userId: ids[key], name })) continue;
    await prisma.business.create({ data: { userId: ids[key], name, category, description, location, phone: '0000000000', photos: photos.map((p) => photo(p)), status: 'APPROVED', createdAt: daysAgo(60 + i) } });
    businesses++;
  }

  let services = 0;
  const cats = new Map((await prisma.serviceCategory.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  for (const [i, [key, businessName, slug, description, location, priceFrom, experienceYears, photos, isFeatured]] of SERVICES.entries()) {
    if (!cats.has(slug) || (await have('serviceProvider', { userId: ids[key], businessName }))) continue;
    await prisma.serviceProvider.create({ data: { userId: ids[key], businessName, categoryId: cats.get(slug), description, location, phone: '0000000000', priceFrom, experienceYears, photos: photos.map((p) => photo(p)), status: 'APPROVED', isFeatured, createdAt: daysAgo(60 + i) } });
    services++;
  }

  let achievements = 0;
  for (const [i, [key, type, name, details]] of ACHIEVEMENTS.entries()) {
    if (await have('achievement', { userId: ids[key], name })) continue;
    await prisma.achievement.create({ data: { userId: ids[key], type, name, photoUrl: avatar(name, BG[(i + 2) % BG.length]), isVerified: true, createdAt: daysAgo(20 - i), ...details } });
    achievements++;
  }
  return { ...(await sampleStatus()), added: { posts, businesses, services, achievements } };
}

/** Removes every sample user — and with them their profiles, posts, listings and achievements. */
export async function removeSampleContent() {
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: SAMPLE_DOMAIN } } });
  return { removed: count, ...(await sampleStatus()) };
}
