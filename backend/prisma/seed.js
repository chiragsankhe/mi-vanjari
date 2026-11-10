/**
 * Seed data for development & demo.
 *   npm run db:seed
 *
 * ⚠ Re-running WIPES ALL DATA in the database first (it is meant for development).
 *   It refuses to run when NODE_ENV=production unless SEED_FORCE=1 is set.
 *
 * Demo logins (OTP is printed in the API log and shown in the login dialog in development):
 *   +91 98765 00001  → Aditya Chavan (member, groom profile)
 *   +91 99999 99999  → Admin
 */
import '../src/config/load-env.js';
import { HISTORY } from './history-data.js';
import { CATEGORIES, MUHURAT, MUHURAT_TITLES } from './reference-data.js';
import { PrismaClient } from '@prisma/client';
import { computeBirthChart } from '../src/services/astrology/engine.js';

const prisma = new PrismaClient();

const U = (id, w = 700) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
// 3 photos per demo member: the portrait, a close-up and a black-and-white version (same person)
export const PHOTO_VARIANTS = (id) => [U(id), `${U(id)}&crop=focalpoint&fp-y=0.3&fp-z=1.6`, `${U(id)}&sat=-100`];
const BLUR = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=60&q=30&blur=200`;

const PORTRAITS = [
  'photo-1673413348184-102e17df237c',
  'photo-1781187009755-0cbc0c4cd2b3',
  'photo-1786299811172-618ec9e24b24',
  'photo-1774868701808-12c52546b346',
  'photo-1763017707379-a7f0dacdb023',
  'photo-1673413349218-ba4de23c2958',
];


// HISTORY lives in ./history-data.js (shared with scripts/update-history.js)

const PROFILES = [
  // phone, name, gender, dob, tob, city, state, edu, occ, gotra, account, photo idx, village
  ['9876500001', 'Aditya Chavan', 'MALE', '1996-08-14', '06:45', 'Pune', 'Maharashtra', 'B.E. Computer Engineering', 'Software Engineer', 'Bharadwaj', 'PUBLIC', null, 'Dahanu'],
  ['9876500002', 'Snehal Chavan', 'FEMALE', '1999-03-22', '09:10', 'Pune', 'Maharashtra', 'M.Sc. Biotechnology', 'Research Associate', 'Kashyap', 'PUBLIC', 0, 'Palghar'],
  ['9876500003', 'Priyanka Jadhav', 'FEMALE', '1998-11-05', '14:30', 'Mumbai', 'Maharashtra', 'B.Tech Information Technology', 'Software Engineer', 'Bharadwaj', 'PUBLIC', 1, 'Vasai'],
  ['9876500004', 'Pooja Rathod', 'FEMALE', '2000-01-17', '18:20', 'Nashik', 'Maharashtra', 'BDS', 'Dentist', 'Vashishtha', 'PUBLIC', 2, 'Jawhar'],
  ['9876500005', 'Aishwarya Shinde', 'FEMALE', '1997-06-30', '11:00', 'Thane', 'Maharashtra', 'MBA Finance', 'Financial Analyst', 'Kashyap', 'PRIVATE', 4, 'Talasari'],
  ['9876500006', 'Kavya Pawar', 'FEMALE', '1999-09-09', '07:35', 'Palghar', 'Maharashtra', 'B.Com', 'Accountant', 'Gautam', 'PRIVATE', 5, 'Safale'],
  ['9876500007', 'Rohan Jadhav', 'MALE', '1995-04-12', '05:50', 'Mumbai', 'Maharashtra', 'MBBS, MD', 'Doctor', 'Atri', 'PUBLIC', null, 'Boisar'],
  ['9876500008', 'Nikhil Rathod', 'MALE', '1994-12-01', '20:15', 'Bengaluru', 'Karnataka', 'M.Tech', 'Product Manager', 'Vishwamitra', 'PRIVATE', null, 'Wada'],
  ['9876500009', 'Sagar Pawar', 'MALE', '1997-02-25', '10:05', 'Palghar', 'Maharashtra', 'Diploma Civil Engineering', 'Civil Contractor', 'Jamadagni', 'PUBLIC', null, 'Manor'],
  ['9876500010', 'Meena Chavan', 'FEMALE', '1985-07-19', '12:00', 'Thane', 'Maharashtra', 'M.A. B.Ed.', 'Teacher & Founder', 'Kashyap', 'PUBLIC', 3, 'Palghar'],
  ['9876500011', 'Suresh Patil', 'MALE', '1978-10-10', '08:00', 'Palghar', 'Maharashtra', 'B.Sc. Agriculture', 'Agri Entrepreneur', 'Bharadwaj', 'PUBLIC', null, 'Dahanu'],
  ['9999999999', 'Mi Vanjari Admin', 'MALE', '1990-01-01', null, 'Palghar', 'Maharashtra', 'Graduate', 'Community Admin', null, 'PUBLIC', null, 'Palghar'],
];

const BIOS = {
  'Aditya Chavan': 'Software engineer in Pune, originally from Dahanu. Love trekking in the Sahyadris, Marathi natya sangeet and weekend cooking with family.',
  'Snehal Chavan': 'Researcher by profession, singer by heart. Family-oriented, simple and looking for a kind, understanding partner.',
  'Priyanka Jadhav': 'Engineer at a Mumbai fintech. I enjoy reading, travel and Lavani dance. Proud of my Palghar roots.',
  'Pooja Rathod': 'Practising dentist in Nashik. Believe in balancing career and family values.',
  'Aishwarya Shinde': 'Finance professional in Thane. Calm, cheerful and close to my family.',
  'Kavya Pawar': 'Accountant, home-maker at heart, love rangoli and festivals.',
  'Rohan Jadhav': 'Physician in Mumbai. Passionate about rural healthcare camps in Palghar district.',
  'Nikhil Rathod': 'Product manager in Bengaluru, founder of GreenRoots — a farm-to-city initiative for Palghar farmers.',
  'Sagar Pawar': 'Running my own construction business in Palghar. Cricket on Sundays, family always.',
};


async function reset() {
  // Order matters for FK constraints
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.postLike.deleteMany(),
    prisma.post.deleteMany(),
    prisma.serviceReview.deleteMany(),
    prisma.package.deleteMany(),
    prisma.serviceProvider.deleteMany(),
    prisma.serviceCategory.deleteMany(),
    prisma.business.deleteMany(),
    prisma.achievement.deleteMany(),
    prisma.historyEntry.deleteMany(),
    prisma.muhuratDate.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.shortlist.deleteMany(),
    prisma.profileView.deleteMany(),
    prisma.report.deleteMany(),
    prisma.rashiRecord.deleteMany(),
    prisma.profilePhoto.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_FORCE !== '1') {
    console.error('Refusing to seed in production (it wipes all data). Set SEED_FORCE=1 to override.');
    process.exit(1);
  }
  console.log('🌱 Seeding Mi Vanjari…');
  await reset();

  // Categories
  const cats = {};
  for (const c of CATEGORIES) cats[c.slug] = await prisma.serviceCategory.create({ data: c });

  // History
  await prisma.historyEntry.createMany({ data: HISTORY });

  // Muhurat
  await prisma.muhuratDate.createMany({
    data: MUHURAT.map(([date, type]) => ({
      date: new Date(`${date}T00:00:00Z`),
      type,
      title: MUHURAT_TITLES[type],
      notes: 'Indicative date — please confirm timing with your family priest or local panchang.',
    })),
  });

  // Users + profiles
  const users = {};
  for (const [i, row] of PROFILES.entries()) {
    const [phone, fullName, gender, dob, tob, city, state, education, occupation, gotra, accountType, photoIdx, village] = row;
    const isAdmin = phone === '9999999999';
    const chart = computeBirthChart(dob, tob || undefined);
    const age = new Date().getFullYear() - Number(dob.slice(0, 4));
    const isMatrimonial = !isAdmin && age < 35;
    const user = await prisma.user.create({
      data: {
        phone: `+91${phone}`,
        isPhoneVerified: true,
        role: isAdmin ? 'ADMIN' : 'USER',
        intents: isMatrimonial ? ['MATRIMONY', 'COMMUNITY'] : ['COMMUNITY', 'BUSINESS'],
        lastActiveAt: new Date(Date.now() - i * 3600_000),
        profile: {
          create: {
            fullName,
            gender,
            dateOfBirth: new Date(`${dob}T00:00:00Z`),
            timeOfBirth: tob,
            placeOfBirth: village,
            rashi: chart.rashi.name,
            nakshatra: chart.nakshatra.name,
            currentCity: city,
            currentState: state,
            nativeVillage: village,
            education,
            occupation,
            gotra,
            subCaste: 'Vanjari',
            bio: BIOS[fullName] ?? null,
            heightCm: gender === 'MALE' ? 172 + (i % 6) : 158 + (i % 6),
            familyType: i % 2 ? 'JOINT' : 'NUCLEAR',
            fatherName: `${['Ramesh', 'Vilas', 'Dilip', 'Prakash', 'Sunil', 'Anil'][i % 6]} ${fullName.split(' ')[1]}`,
            fatherOccupation: ['Farmer', 'Teacher', 'Business', 'Retired govt. officer'][i % 4],
            motherName: ['Sunita', 'Lata', 'Asha', 'Vandana', 'Kalpana'][i % 5],
            siblingsCount: (i % 3) + 1,
            prefAgeMin: gender === 'MALE' ? 22 : 25,
            prefAgeMax: gender === 'MALE' ? 29 : 33,
            prefLocation: 'Maharashtra',
            isMatrimonial,
            accountType,
            showPhone: accountType === 'PUBLIC',
            isVerified: i % 5 !== 4,
            profilePhotoUrl: photoIdx != null ? U(PORTRAITS[photoIdx]) : null,
            profilePhotoBlurUrl: photoIdx != null ? BLUR(PORTRAITS[photoIdx]) : null,
            ...(photoIdx != null && {
              photos: { create: PHOTO_VARIANTS(PORTRAITS[photoIdx]).map((url, sortOrder) => ({ url, blurUrl: BLUR(PORTRAITS[photoIdx]), sortOrder })) },
            }),
          },
        },
      },
    });
    users[fullName] = user;
  }

  const aditya = users['Aditya Chavan'];
  const snehal = users['Snehal Chavan'];
  const pooja = users['Pooja Rathod'];

  // Social graph & a demo conversation
  await prisma.follow.createMany({
    data: [
      { senderId: aditya.id, receiverId: snehal.id, status: 'ACCEPTED' },
      { senderId: snehal.id, receiverId: aditya.id, status: 'ACCEPTED' },
      { senderId: aditya.id, receiverId: pooja.id, status: 'ACCEPTED' },
      { senderId: users['Kavya Pawar'].id, receiverId: aditya.id, status: 'PENDING' },
      { senderId: users['Rohan Jadhav'].id, receiverId: aditya.id, status: 'ACCEPTED' },
      { senderId: users['Meena Chavan'].id, receiverId: aditya.id, status: 'ACCEPTED' },
    ],
  });
  const [p1, p2] = [aditya.id, snehal.id].sort();
  const convo = await prisma.conversation.create({ data: { participant1Id: p1, participant2Id: p2 } });
  const t0 = Date.now() - 2 * 3600_000;
  await prisma.message.createMany({
    data: [
      { conversationId: convo.id, senderId: snehal.id, receiverId: aditya.id, content: 'Namaskar! Thank you for connecting with me.', isRead: true, createdAt: new Date(t0) },
      { conversationId: convo.id, senderId: aditya.id, receiverId: snehal.id, content: 'Namaskar, Snehal. It’s nice to connect with you too.', isRead: true, createdAt: new Date(t0 + 3 * 60_000) },
      { conversationId: convo.id, senderId: snehal.id, receiverId: aditya.id, content: 'Thank you, I’ll let my family know.', isRead: false, createdAt: new Date(t0 + 7 * 60_000) },
    ],
  });
  await prisma.conversation.update({ where: { id: convo.id }, data: { lastMessageAt: new Date(t0 + 7 * 60_000) } });
  await prisma.notification.createMany({
    data: [
      { userId: aditya.id, type: 'FOLLOW_REQUEST', content: 'Kavya Pawar sent you a follow request', fromUserId: users['Kavya Pawar'].id, link: '/requests' },
      { userId: aditya.id, type: 'FOLLOW_ACCEPTED', content: 'Pooja Rathod accepted your follow request', fromUserId: pooja.id, link: `/profile/${pooja.id}`, isRead: true },
    ],
  });
  await prisma.profileView.createMany({
    data: [snehal.id, pooja.id, users['Priyanka Jadhav'].id, users['Kavya Pawar'].id].map((viewerId) => ({ viewerId, viewedId: aditya.id })),
  });

  // Wedding services
  const providers = {};
  const mkProvider = async (key, owner, data) => {
    providers[key] = await prisma.serviceProvider.create({ data: { userId: owner.id, status: 'APPROVED', phone: owner.phone, ...data } });
  };
  await mkProvider('planner', users['Sagar Pawar'], {
    businessName: 'Sai Mangal Wedding Planners',
    categoryId: cats.decoration.id,
    description: 'Complete wedding planning from trusted professionals in Palghar and Mumbai — mandap, flowers, lighting and coordination for traditional Vanjari weddings.',
    location: 'Palghar, Thane & Mumbai',
    priceFrom: 75000,
    isFeatured: true,
    ratingAvg: 4.9,
    ratingCount: 124,
    photos: [U(PORTRAITS[5], 1000)],
  });
  await mkProvider('hall', users['Suresh Patil'], {
    businessName: 'Shree Ganesh Mangal Karyalay',
    categoryId: cats['wedding-halls'].id,
    description: 'AC hall for 800 guests with dining area, bridal rooms and parking. Walking distance from Palghar station.',
    location: 'Palghar',
    priceFrom: 45000,
    ratingAvg: 4.6,
    ratingCount: 58,
    photos: [],
  });
  await mkProvider('dj', users['Sagar Pawar'], {
    businessName: 'Dhol Tasha & DJ Sai Beats',
    categoryId: cats['dj-music'].id,
    description: 'Traditional dhol-tasha pathak for varat plus DJ and sound for sangeet and reception.',
    location: 'Boisar, Palghar',
    priceFrom: 18000,
    ratingAvg: 4.7,
    ratingCount: 41,
    photos: [],
  });
  await mkProvider('catering', users['Meena Chavan'], {
    businessName: 'Aai’s Kitchen Caterers',
    categoryId: cats.catering.id,
    description: 'Authentic Maharashtrian wedding thali — puran poli, masale bhat, varan, and modern live counters.',
    location: 'Mumbai & Thane',
    priceFrom: 350,
    isFeatured: true,
    ratingAvg: 4.8,
    ratingCount: 96,
    photos: [],
  });
  await mkProvider('makeup', users['Kavya Pawar'], {
    businessName: 'Navvari Bridal Studio',
    categoryId: cats.makeup.id,
    description: 'Bridal makeup, nauvari draping and traditional jewellery styling.',
    location: 'Palghar',
    priceFrom: 12000,
    ratingAvg: 4.9,
    ratingCount: 37,
    photos: [U(PORTRAITS[3], 1000)],
  });
  await mkProvider('photo', users['Rohan Jadhav'], {
    businessName: 'Kshan Photography',
    categoryId: cats.photography.id,
    description: 'Candid photography, cinematic films and pre-wedding shoots across Konkan.',
    location: 'Vasai – Virar',
    priceFrom: 40000,
    ratingAvg: 4.8,
    ratingCount: 63,
    photos: [U(PORTRAITS[1], 1000)],
  });
  await prisma.serviceProvider.create({
    data: {
      userId: aditya.id,
      businessName: 'Pending Demo Sound Service',
      categoryId: cats['dj-music'].id,
      phone: aditya.phone,
      location: 'Pune',
      description: 'Listing awaiting admin approval (demo).',
      status: 'PENDING',
      photos: [],
    },
  });

  // Combo packages
  await prisma.package.create({
    data: {
      title: 'Complete Wedding Package',
      titleMr: 'संपूर्ण लग्न पॅकेज',
      description: 'Hall + Catering + DJ + Decoration from trusted community providers.',
      price: 120000,
      originalPrice: 148000,
      includes: ['Wedding Hall', 'Catering (300 guests)', 'DJ & Dhol', 'Decoration'],
      isFeatured: true,
      providers: { connect: [providers.hall, providers.catering, providers.dj, providers.planner].map((p) => ({ id: p.id })) },
    },
  });
  await prisma.package.create({
    data: {
      title: 'Bride Special',
      titleMr: 'नववधू विशेष',
      description: 'Bridal makeup, nauvari draping and full-day photography.',
      price: 45000,
      originalPrice: 52000,
      includes: ['Bridal makeup', 'Nauvari draping', 'Photography (1 day)'],
      providers: { connect: [providers.makeup, providers.photo].map((p) => ({ id: p.id })) },
    },
  });
  await prisma.package.create({
    data: {
      title: 'Sakharpuda Celebration',
      titleMr: 'साखरपुडा सोहळा',
      description: 'Engagement ceremony essentials for up to 150 guests.',
      price: 38000,
      originalPrice: 44000,
      includes: ['Decoration', 'Catering (150 guests)', 'Photography'],
      providers: { connect: [providers.planner, providers.catering, providers.photo].map((p) => ({ id: p.id })) },
    },
  });

  // Businesses
  await prisma.business.createMany({
    data: [
      {
        userId: users['Suresh Patil'].id,
        name: 'Patil Agro Solutions',
        category: 'Agriculture',
        description: 'Seeds, organic fertilisers, drip irrigation installation and farm advisory for Palghar farmers.',
        phone: users['Suresh Patil'].phone,
        whatsapp: users['Suresh Patil'].phone,
        location: 'Dahanu, Palghar',
        photos: [],
      },
      {
        userId: users['Meena Chavan'].id,
        name: 'Dnyandeep Academy',
        category: 'Education',
        description: 'Coaching for 10th, 12th and competitive exams with special scholarships for community students.',
        phone: users['Meena Chavan'].phone,
        location: 'Thane',
        photos: [U(PORTRAITS[3], 900)],
      },
      {
        userId: users['Sagar Pawar'].id,
        name: 'Pawar Constructions',
        category: 'Construction',
        description: 'Residential construction, renovation and RCC work across Palghar district.',
        phone: users['Sagar Pawar'].phone,
        location: 'Manor, Palghar',
        photos: [],
      },
      {
        userId: users['Meena Chavan'].id,
        name: 'Aai’s Kitchen',
        category: 'Food & Catering',
        description: 'Home-style Maharashtrian tiffin service and festive orders.',
        phone: users['Meena Chavan'].phone,
        location: 'Mumbai',
        photos: [],
      },
    ],
  });

  // Achievers
  await prisma.achievement.createMany({
    data: [
      { userId: users['Meena Chavan'].id, type: 'ACADEMIC', name: 'Aarohi Jadhav', schoolName: 'Z.P. High School, Palghar', percentage: 96.4, grade: '10th', year: 2026, stream: 'SSC', isVerified: true, photoUrl: U(PORTRAITS[1], 500) },
      { userId: users['Meena Chavan'].id, type: 'ACADEMIC', name: 'Omkar Pawar', schoolName: 'Sonopant Dandekar College', percentage: 93.2, grade: '12th', year: 2026, stream: 'Science', isVerified: true },
      { userId: users['Meena Chavan'].id, type: 'ACADEMIC', name: 'Sakshi Rathod', schoolName: 'K.L. Ponda High School, Dahanu', percentage: 94.8, grade: '10th', year: 2025, stream: 'SSC', isVerified: true, photoUrl: U(PORTRAITS[2], 500) },
      { userId: users['Nikhil Rathod'].id, type: 'PROFESSIONAL', name: 'Nikhil Rathod', role: 'Founder', company: 'GreenRoots', city: 'Mumbai', description: 'Built a farm-to-city supply network that helps 300+ Palghar farmers sell directly to urban buyers.', isVerified: true },
      { userId: users['Rohan Jadhav'].id, type: 'PROFESSIONAL', name: 'Dr. Kavita Shinde', role: 'Cardiologist', company: 'Ruby Hall Clinic', city: 'Pune', description: 'Leads free heart-health camps in tribal and rural areas of Palghar every year.', isVerified: true, photoUrl: U(PORTRAITS[4], 500) },
      { userId: aditya.id, type: 'ACADEMIC', name: 'Pending Demo Student', schoolName: 'Demo School', percentage: 91, grade: '12th', year: 2026, isVerified: false },
    ],
  });

  // Community posts
  const posts = [
    [users['Meena Chavan'], 'Dnyandeep Academy is offering free weekend coaching for 10th standard students from our community this year. Share with families who may need it 🙏'],
    [users['Nikhil Rathod'], 'GreenRoots crossed 300 farmer partners from Palghar this season! Thank you to everyone who supported local produce.'],
    [snehal, 'Beautiful Kojagiri celebration in our Pune Vanjari mandal last week — so good to meet families from home 🌕'],
  ];
  for (const [i, [author, content]] of posts.entries()) {
    await prisma.post.create({ data: { authorId: author.id, content, likeCount: 12 - i * 3, createdAt: new Date(Date.now() - (i + 1) * 86400_000) } });
  }

  const counts = await Promise.all([prisma.user.count(), prisma.serviceProvider.count(), prisma.business.count(), prisma.achievement.count()]);
  console.log(`✔ Seeded ${counts[0]} users, ${counts[1]} service providers, ${counts[2]} businesses, ${counts[3]} achievements`);
  console.log('  Demo login: 98765 00001 (member) · 99999 99999 (admin) — OTP appears in the API log / login dialog in dev');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
