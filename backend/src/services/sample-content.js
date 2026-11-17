import { prisma } from '../lib/prisma.js';
import { computeBirthChart } from './astrology/engine.js';

/**
 * Sample content — so a new visitor sees how the site looks when it is busy.
 *
 * Honest by design:
 *  • everything is tagged "Sample" in the site (Profile.isDemo)
 *  • the grooms (Sahil, Tanmay, Abhishek, Siddhesh, Atharv) have every profile field filled in and several photos each
 *  • sample members and matrimony samples carry free stock portraits (Unsplash) and community surnames; names and stories are made up
 *  • student achievers show a study photo, not a child's face
 *  • sample profiles cannot be messaged or followed, and have no phone numbers
 *  • the few matrimony profiles carry the "Sample" tag, no contact details, and cannot be messaged, followed or paid for
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
  makeup1: '1487412947147-5cebf100ffc2',
  makeup2: '1522335789203-aabd1fc54bc9',
  makeup3: '1596462502278-27bfdc403348',
  hair: '1560869713-7d0a29430803',
  pearls: '1515562141207-7a88fb7ce338',
  bracelet: '1573408301185-9146fe634ad0',
  earrings: '1535632066927-ab7c9ab60908',
  car: '1485291571150-772bcfc10da5',
  suv: '1519641471654-76ce0107ad1b',
  gifts: '1607344645866-009c320b63e0',
  balloons: '1530103862676-de8c9debad1d',
  couple: '1583939003579-730e3918a45a',
  table: '1519225421980-715cb0215aed',
  rings: '1606800052052-a08af7148866',
  clothes: '1512436991641-6745cdb1723f',
};
const nameKey = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
const avatar = (seed, bg) => `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&scale=85`;
const BG = ['ffd5dc', 'ffdfbf', 'c0aede', 'd1d4f9', 'b6e3f4', 'e8d5b5'];
// free Unsplash portraits for the sample community members (adults only), cropped around the face
const portrait = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=600&h=600&q=75`;
// 4:5 crop around the face, for the matrimony photo gallery
const tall = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&w=900&h=1125&q=75`;
const PORTRAIT = {
  sunita: '1774437891540-05ee35e087dc', rahul: '1637651808680-d054b0744fe8', pooja: '1789500381106-ba13068a6520', amit: '1769598250411-815c984c33c3',
  kavita: '1763017707624-213684457a9d', santosh: '1774437678561-c321687f6986', rekha: '1774438533054-5a0cc8d24586', nilesh: '1589386417686-0d34b5903d23',
  snehal: '1596196524143-569109d9a645', prakash: '1758685734463-98672a67dd1c', manisha: '1725611224180-4a50ef13a0e8', vijay: '1667655787062-b675b26d5c4b',
  saroj: '1759840278381-bf7d5e332050', dinesh: '1781106784036-8c6a4842a37d', meena: '1597897569252-9df44c7de0db', ganesh: '1778692258270-bc0e80e975c0',
  ashwini: '1774437891793-2013f7b5a04a',
  // matrimony samples
  'm-riya': '1770838447151-05a876cdee3d', 'm-neha': '1646979201169-e83d743bfa8d', 'm-komal': '1767607740661-05e668190cdc',
  'm-akash': '1757744705465-ea08b0ddc38a', 'm-rohan': '1729157661483-ed21901ed892', 'm-yogesh': '1782323709687-43675cbddd46',
};

// key, name, gender, city, village, occupation, birth year, bio
const MEMBERS = [
  ['sunita', 'Sunita Patil', 'FEMALE', 'Palghar', 'Kelve', 'School teacher', 1988, 'Teaching maths to village children for 12 years. Love rangoli and Sunday family lunches.'],
  ['rahul', 'Rahul Sankhe', 'MALE', 'Boisar', 'Tarapur', 'Civil engineer', 1990, 'Builds homes for a living. Cricket on weekends with the Boisar boys.'],
  ['pooja', 'Pooja Vade', 'FEMALE', 'Vasai', 'Nalasopara', 'Staff nurse', 1993, 'Nursing is service. Happy to guide girls who want to study nursing.'],
  ['amit', 'Amit Pimple', 'MALE', 'Dahanu', 'Gholvad', 'Dairy farmer', 1985, 'Third-generation dairy farmer. Fresh milk, ghee and a lot of patience.'],
  ['kavita', 'Kavita Bore', 'FEMALE', 'Talasari', 'Kochai', 'Shop & decoration business', 1991, 'Runs a small store and does wedding mandap flowers on the side.'],
  ['santosh', 'Santosh Sankhe', 'MALE', 'Wada', 'Kudus', 'Transport & hall owner', 1983, 'Trucks, a mangal karyalay and too many phone calls.'],
  ['rekha', 'Rekha Pimple', 'FEMALE', 'Jawhar', 'Vikramgad', 'Homemaker & Warli artist', 1987, 'Warli paintings, village stories and monsoon walks.'],
  ['nilesh', 'Nilesh Vade', 'MALE', 'Mumbai', 'Virar', 'Software developer', 1994, 'Writes code in Mumbai, always up for a trek to Kalsubai.'],
  ['snehal', 'Snehal Patil', 'FEMALE', 'Pune', 'Mokhada', 'Chartered accountant', 1992, 'First CA in the family. Believes every girl should finish her education.'],
  ['prakash', 'Prakash Bore', 'MALE', 'Nashik', 'Peth', 'Catering owner', 1980, 'Feeding weddings and functions since 2008. Misal is my speciality.'],
  ['manisha', 'Manisha Sankhe', 'FEMALE', 'Thane', 'Shahapur', 'Wedding photographer', 1991, 'Candid wedding stories. Camera in one hand, chai in the other.'],
  ['vijay', 'Vijay Patil', 'MALE', 'Palghar', 'Mahim', 'Sound & DJ, agro centre', 1989, 'Sound systems for every function, and seeds & fertilisers for every farm.'],
  ['saroj', 'Saroj Vade', 'FEMALE', 'Boisar', 'Chilhar', 'Makeup artist', 1992, 'Bridal and party makeup artist. A happy bride is my best advertisement.'],
  ['dinesh', 'Dinesh Pimple', 'MALE', 'Nashik', 'Trimbak', 'Pandit & purohit', 1979, 'Performing vivah, griha pravesh and satyanarayan poojas for 20 years.'],
  ['meena', 'Meena Patil', 'FEMALE', 'Vasai', 'Virar', 'Boutique & jewellery owner', 1986, 'Bridal wear and traditional jewellery on rent and for sale.'],
  ['ganesh', 'Ganesh Pimple', 'MALE', 'Thane', 'Murbad', 'Wedding planner', 1988, 'I plan weddings so that families can enjoy them.'],
  ['ashwini', 'Ashwini Sankhe', 'FEMALE', 'Palghar', 'Saphale', 'Printing & invitation cards', 1990, 'Invitation cards, banners and digital invites, delivered on time.'],
];

// Matrimony samples — key, name, gender, birth year, city, height cm, degree, occupation, income, gotra, family, bio
const MATRIMONY = [
  ['m-riya', 'Riya Patil', 'FEMALE', 1998, 'Palghar', 160, 'B.Sc. Nursing', 'Staff nurse', '₹3–5 lakh', 'Kashyap', 'JOINT', 'Sample profile. Family-oriented, loves cooking and classical dance.'],
  ['m-neha', 'Neha Sankhe', 'FEMALE', 1996, 'Thane', 163, 'MBA (HR)', 'HR executive', '₹6–8 lakh', 'Vatsa', 'NUCLEAR', 'Sample profile. Working in Thane; enjoys travel and music.'],
  ['m-komal', 'Komal Vade', 'FEMALE', 1999, 'Vasai', 158, 'B.Ed.', 'School teacher', '₹3–4 lakh', 'Bharadwaj', 'JOINT', 'Sample profile. Loves teaching and long walks by the sea.'],
  ['m-akash', 'Akash Pimple', 'MALE', 1995, 'Boisar', 175, 'B.E. Mechanical', 'Production engineer', '₹6–8 lakh', 'Kashyap', 'JOINT', 'Sample profile. Engineer, cricket lover, close with his family.'],
  ['m-rohan', 'Rohan Bore', 'MALE', 1993, 'Nashik', 178, 'B.Com., MBA', 'Bank manager', '₹8–10 lakh', 'Vatsa', 'NUCLEAR', 'Sample profile. Bank manager who enjoys trekking and photography.'],
  ['m-yogesh', 'Yogesh Patil', 'MALE', 1994, 'Dahanu', 172, 'B.Sc. Agriculture', 'Farmer & dairy owner', '₹5–7 lakh', 'Bharadwaj', 'JOINT', 'Sample profile. Modern farmer with a dairy business and a big heart.'],
];


// More matrimony samples (grooms) with every detail filled in and several photos each.
// The photos of one groom come from the same free Unsplash photo shoot, so the gallery shows the same person.
const GROOMS = [
  {
    key: 'm-sahil', name: 'Sahil Sankhe', dob: '1996-08-14', tob: '07:20', city: 'Boisar', village: 'Kurgaon', district: 'Palghar', height: 176, weight: 71, blood: 'B+', body: 'Athletic',
    photos: ['1648577735298-385ccb9755c0', '1648577736141-58d4c7dcb66d', '1648577736128-2dea491616ea'],
    quals: [{ degree: 'B.E. Electronics', institute: 'Mumbai University', year: 2018 }], highest: 'Engineering (B.E. / B.Tech)', employment: 'Private job', occupation: 'Engineer', designation: 'Assistant Manager – Quality', company: 'A pharma company, Tarapur MIDC', workCity: 'Boisar', exp: 6.5, income: '₹6–10 L',
    gotra: 'Kashyap', devak: 'Panchpallav', kuldaivat: 'Khandoba of Jejuri', familyType: 'JOINT', father: 'Ramesh Sankhe', fatherJob: 'Farmer', mother: 'Sunita Sankhe', motherJob: 'Homemaker', brothers: 1, marriedBrothers: 1, sisters: 1, marriedSisters: 0,
    values: 'Traditional', aboutFamily: 'A close joint family from Kurgaon with fields and a small dairy. Father farms, elder brother runs the dairy, mother manages the home. We celebrate every festival together.',
    diet: 'Non-vegetarian', drinking: 'Never', smoking: 'Never', hobbies: ['Photography', 'Travelling', 'Cricket'], interests: ['Nature', 'Technology'], languages: ['Marathi', 'Hindi', 'English'],
    bio: 'Sample profile. Quality engineer who loves weekend treks and photography. Close with family and looking for a caring, educated partner.',
    goals: 'Grow into a plant quality head in the next 5 years and build a home near Boisar.', expect: 'Looking for a kind, family-minded and educated girl who is comfortable in a joint family.',
    prefAge: [23, 28], prefEdu: 'Graduate', prefLoc: 'Palghar, Mumbai', prefJob: 'Working or homemaker', prefName: 'Any good family',
  },
  {
    key: 'm-tanmay', name: 'Tanmay Pimple', dob: '1997-03-22', tob: '05:45', city: 'Palghar', village: 'Mahim', district: 'Palghar', height: 173, weight: 68, blood: 'O+', body: 'Average',
    photos: ['1768807478320-fcfd3929acb2', '1768807478287-9e7953cfdca3'],
    quals: [{ degree: 'B.Com.', institute: 'Mumbai University', year: 2018 }, { degree: 'MBA (Finance)', institute: 'Mumbai University', year: 2020 }], highest: 'Post-graduate (M.A. / M.Com. / M.Sc. / MBA)', employment: 'Private job', occupation: 'Bank employee', designation: 'Relationship Manager', company: 'A private bank', workCity: 'Palghar', exp: 4, income: '₹6–10 L',
    gotra: 'Vatsa', devak: 'Surya-Pushpa', kuldaivat: 'Tulja Bhavani', familyType: 'NUCLEAR', father: 'Dilip Pimple', fatherJob: 'Government service', mother: 'Meena Pimple', motherJob: 'Teacher', brothers: 0, marriedBrothers: 0, sisters: 1, marriedSisters: 1,
    values: 'Moderate', aboutFamily: 'A small, educated family in Palghar. Father is retired from a government office, mother teaches at a local school, elder sister is married and lives in Vasai.',
    diet: 'Vegetarian', drinking: 'Never', smoking: 'Never', hobbies: ['Music', 'Reading', 'Yoga / Fitness'], interests: ['Business', 'Spirituality'], languages: ['Marathi', 'Hindi', 'English'],
    bio: 'Sample profile. Bank manager in the making who enjoys music and early-morning runs. Believes in simple living and respect at home.',
    goals: 'Become a branch manager and start a financial advisory firm on the side.', expect: 'A well-educated, understanding girl with good values; working or not, her choice.',
    prefAge: [22, 27], prefEdu: 'Graduate or above', prefLoc: 'Maharashtra', prefJob: 'Any', prefName: 'Any good family',
  },
  {
    key: 'm-abhishek', name: 'Abhishek Patil', dob: '1994-11-05', tob: '14:10', city: 'Vasai', village: 'Nalasopara', district: 'Palghar', height: 178, weight: 76, blood: 'A+', body: 'Athletic',
    photos: ['1712425718137-491250cfde88', '1712425718085-cdd2b2298669'],
    quals: [{ degree: 'B.E. Computer Engineering', institute: 'Mumbai University', year: 2016 }], highest: 'Engineering (B.E. / B.Tech)', employment: 'Private job', occupation: 'Software engineer', designation: 'Senior Software Engineer', company: 'An IT company, Mumbai', workCity: 'Mumbai', exp: 8, income: '₹10–20 L',
    gotra: 'Bharadwaj', devak: 'Kadamb', kuldaivat: 'Jotiba of Kolhapur', familyType: 'NUCLEAR', father: 'Suresh Patil', fatherJob: 'Business', mother: 'Kavita Patil', motherJob: 'Homemaker', brothers: 1, marriedBrothers: 0, sisters: 0, marriedSisters: 0,
    values: 'Moderate', aboutFamily: 'Father runs a hardware shop in Nalasopara; mother looks after the home. Younger brother is studying engineering. Weekends are for family lunch and cricket.',
    diet: 'Non-vegetarian', drinking: 'Occasionally', smoking: 'Never', hobbies: ['Cricket', 'Movies', 'Travelling'], interests: ['Technology', 'Sports'], languages: ['Marathi', 'Hindi', 'English'],
    bio: 'Sample profile. Software engineer working in Mumbai, loves cricket and long drives. Wants a partner to build a happy, balanced home with.',
    goals: 'Move into an engineering-manager role and buy a flat in Vasai.', expect: 'An educated, independent and cheerful girl; a working partner is welcome.',
    prefAge: [24, 29], prefEdu: 'Graduate or above', prefLoc: 'Mumbai, Vasai, Thane', prefJob: 'Working preferred', prefName: 'Any good family',
  },
  {
    key: 'm-siddhesh', name: 'Siddhesh Vade', dob: '1995-06-18', tob: '09:35', city: 'Boisar', village: 'Dedale', district: 'Palghar', height: 172, weight: 70, blood: 'AB+', body: 'Average',
    photos: ['1694871420544-e13a86f35772', '1616002851413-ebcc9611139d', '1694871420538-b40db58ae5af'],
    quals: [{ degree: 'B.Sc. Agriculture', institute: 'Agricultural University', year: 2017 }], highest: 'Graduate (B.A. / B.Com. / B.Sc. / BBA)', employment: 'Own business', occupation: 'Business owner', business: 'Vade Agro & Dairy', bizType: 'Dairy / Poultry', bizYears: 5, income: '₹6–10 L',
    gotra: 'Kashyap', devak: 'Ashok', kuldaivat: 'Khandoba of Jejuri', familyType: 'JOINT', father: 'Prakash Vade', fatherJob: 'Farmer', mother: 'Sangeeta Vade', motherJob: 'Farmer', brothers: 1, marriedBrothers: 0, sisters: 1, marriedSisters: 1,
    values: 'Traditional', aboutFamily: 'A hard-working farming family in Dedale village with orchards and a dairy of 25 cows. Everyone eats together and every festival is celebrated in the old way.',
    diet: 'Non-vegetarian', drinking: 'Never', smoking: 'Never', hobbies: ['Farming', 'Cricket', 'Social service'], interests: ['Business', 'Community work'], languages: ['Marathi', 'Hindi'],
    bio: 'Sample profile. Agriculture graduate running the family dairy and agro business. Simple, honest and fond of village life.',
    goals: 'Expand the dairy into a packaged milk brand for Palghar.', expect: 'A caring, practical girl who is happy with village and town life alike.',
    prefAge: [22, 27], prefEdu: 'HSC or above', prefLoc: 'Palghar, Thane', prefJob: 'Any', prefName: 'Farming or business family',
  },
  {
    key: 'm-atharv', name: 'Atharv Bore', dob: '1998-01-09', tob: '19:50', city: 'Thane', village: 'Wada', district: 'Thane', height: 175, weight: 66, blood: 'B-', body: 'Slim',
    photos: ['1648577739099-f1e18f8563f0', '1648577737609-84b786caefa7'],
    quals: [{ degree: 'B.Sc. IT', institute: 'Mumbai University', year: 2019 }], highest: 'Graduate (B.A. / B.Com. / B.Sc. / BBA)', employment: 'Self-employed / Freelance', occupation: 'Designer / Artist', business: 'Bore Visuals (photography & video)', bizType: 'Services', bizYears: 3, income: '₹3–6 L',
    gotra: 'Vatsa', devak: 'Panchpallav', kuldaivat: 'Tulja Bhavani', familyType: 'NUCLEAR', father: 'Anil Bore', fatherJob: 'Private service', mother: 'Rekha Bore', motherJob: 'Homemaker', brothers: 0, marriedBrothers: 0, sisters: 1, marriedSisters: 0,
    values: 'Liberal', aboutFamily: 'A cheerful family of four in Thane. Father works in a private firm, mother is a homemaker, younger sister is in college. Home is full of music and photographs.',
    diet: 'Eggetarian', drinking: 'Occasionally', smoking: 'Never', hobbies: ['Photography', 'Music', 'Travelling'], interests: ['Art & crafts', 'Nature'], languages: ['Marathi', 'Hindi', 'English'],
    bio: 'Sample profile. Wedding and travel photographer who runs his own small studio. Loves road trips, old Marathi songs and good coffee.',
    goals: 'Grow the studio into a team of ten and shoot a full-length travel film.', expect: 'A friendly, open-minded girl who values family and enjoys travelling.',
    prefAge: [21, 26], prefEdu: 'Graduate', prefLoc: 'Thane, Mumbai, Pune', prefJob: 'Any', prefName: 'Any good family',
  },
];

// owner key, name, category, description, location, photos
const BUSINESSES = [
  ['amit', 'Pimple Dairy Farm & Milk Products', 'Dairy & Poultry', 'Fresh cow and buffalo milk, ghee, paneer and dahi from our own farm, delivered every morning.', 'Dahanu', [IMG.cows, IMG.field]],
  ['santosh', 'Sankhe Transport & Logistics', 'Transport', 'Goods transport across Maharashtra and Gujarat. Trucks of all sizes, on-time delivery.', 'Wada', [IMG.truck]],
  ['kavita', 'Bore Kirana & General Store', 'Shop & Retail', 'Groceries, household items and daily needs. Home delivery within Talasari.', 'Talasari', [IMG.groceries, IMG.vegMarket]],
  ['rahul', 'Sankhe Construction & Interiors', 'Construction', 'Houses, shops and renovations with honest estimates and transparent progress updates.', 'Boisar', [IMG.construction]],
  ['sunita', 'Patil Study Circle', 'Education', 'Evening tuitions for classes 8–10: maths, science and English. Small batches, personal attention.', 'Palghar', [IMG.books, IMG.study]],
  ['nilesh', 'Vade Web & App Studio', 'IT & Services', 'Websites, apps and digital marketing for small businesses and shops.', 'Mumbai', [IMG.team]],
  ['vijay', 'Patil Agro Centre', 'Agriculture', 'Quality seeds, fertilisers and crop-care advice for farmers around Palghar.', 'Palghar', [IMG.corn, IMG.field]],
  ['prakash', 'Bore Misal & Snacks', 'Food & Catering', 'Famous misal pav, vada pav and snacks. Bulk orders for functions and offices.', 'Nashik', [IMG.plated]],
];

// owner key, name, category slug, description, location, priceFrom, years, photos, featured, subcategories, packages
// package = [name, price, duration, description, services included, details, photos]
const SERVICES = [
  ['prakash', 'Bore Catering – Weddings & Functions', 'catering', 'Traditional Maharashtrian wedding menus, live counters and sweets. Hygienic kitchen, trained serving staff. Tasting before you book.', 'Nashik, Palghar, Thane', 350, 12, [IMG.buffet, IMG.plated], true,
    ['Wedding Caterers', 'Maharashtrian Food', 'Veg Catering', 'Live Food Counters'], [
      ['Classic Veg Thali (per plate)', 350, 'Minimum 200 plates', 'A full Maharashtrian vegetarian wedding thali served buffet style.', ['2 sabzi + 1 usal', 'Varan bhaat, poli, puri', 'Two sweets', 'Salad, papad, pickle', 'Buttermilk'], 'Serving staff and utensils included. Tasting on request.', ['buffet']],
      ['Premium Wedding Menu (per plate)', 550, 'Minimum 150 plates', 'A grand menu with starters, live counters and desserts for the big day.', ['Welcome drink', '3 starters', 'Live chaat & pav-bhaji counter', 'Full thali with 3 sweets', 'Ice cream'], 'Decorated counters and uniformed staff included.', ['plated', 'buffet']],
      ['Haldi & Sakharpuda Snacks (per plate)', 180, 'Up to 100 guests', 'Light snacks and tea for small functions.', ['Misal pav / vada pav', 'Sheera', 'Tea & coffee'], null, ['plated']],
    ]],
  ['manisha', 'Manisha Sankhe Photography', 'photography', 'Candid wedding photography and cinematic videos. Pre-wedding shoots, albums and same-week sneak peeks.', 'Thane, Mumbai, Palghar', 25000, 8, [IMG.camera, IMG.camera2], true,
    ['Wedding Photographer', 'Pre-Wedding Shoot', 'Cinematic Video', 'Wedding Albums'], [
      ['Wedding Day Photography', 25000, 'Full day (10 hours)', 'Candid and traditional photography of all wedding rituals.', ['2 photographers', 'Unlimited photos', '300 edited photos', 'Online gallery'], 'Travel outside Thane charged extra.', ['camera', 'camera2']],
      ['Photo + Cinematic Video', 45000, 'Full day', 'Photography plus a cinematic highlight film and full ceremony video.', ['2 photographers + 1 videographer', '5-minute highlight film', 'Full ceremony video', '30-page album'], null, ['camera2', 'camera']],
      ['Pre-Wedding Shoot', 12000, '4 hours', 'An outdoor shoot for the couple at a location near you.', ['1 location', '50 edited photos', '1-minute reel'], 'Outfit changes up to 3.', ['couple']],
    ]],
  ['vijay', 'Patil Sound & DJ', 'dj-music', 'Powerful sound, lights and DJ for sangeet, haldi and baraat. Banjo and dhol groups arranged on request.', 'Palghar, Boisar, Vasai', 15000, 6, [IMG.concert, IMG.concert2], false,
    ['DJ Sound System', 'Banjo Party', 'Dhol Tasha Pathak'], [
      ['Sangeet DJ Night', 15000, '5 hours', 'DJ, sound and dance-floor lights for your sangeet or reception.', ['DJ console & operator', 'Line-array speakers', 'Moving-head lights', 'Fog machine'], 'Generator backup on request.', ['concert', 'concert2']],
      ['Baraat Banjo + Dhol', 12000, '2 hours', 'A lively baraat with banjo and dhol-tasha team.', ['8-member banjo party', 'Dhol & tasha', 'Decorated bandwagon'], 'Within 30 km of Palghar.', ['concert2']],
    ]],
  ['kavita', 'Kavita Mandap & Floral Decoration', 'decoration', 'Fresh-flower mandaps, stage and entrance decoration, with traditional and modern themes.', 'Talasari, Dahanu, Palghar', 20000, 10, [IMG.decor, IMG.flowers], true,
    ['Mandap Decoration', 'Stage Decoration', 'Flower Decoration', 'Entrance Decoration'], [
      ['Mandap + Stage Package', 20000, 'Set-up the day before', 'Fresh-flower mandap and a matching reception stage.', ['Mandap with flowers', 'Reception stage', 'Fairy-light backdrop', 'Two flower pillars'], null, ['decor', 'flowers']],
      ['Complete Wedding Decoration', 55000, 'Full event', 'Entrance, mandap, stage, aisle, dining area and haldi corner.', ['Entrance arch', 'Mandap & stage', 'Aisle flowers', 'Dining area decor', 'Haldi corner'], 'Theme can be customised.', ['decor', 'hall']],
      ['Haldi Decoration', 8000, '3 hours', 'A cheerful yellow-and-marigold haldi set-up.', ['Marigold backdrop', 'Seating', 'Props'], null, ['flowers']],
    ]],
  ['santosh', 'Sankhe Mangal Karyalay', 'wedding-halls', 'Spacious hall with dining area, bridal rooms and parking for 200 vehicles. Generator backup.', 'Wada', 40000, 15, [IMG.hall, IMG.decor], false,
    ['Marriage Hall', 'Community Hall', 'Guest House'], [
      ['Hall – Full Day', 40000, '12 hours', 'The main hall with dining area and parking.', ['600 seating capacity', 'Dining hall', 'Parking for 200 vehicles', 'Generator backup'], 'Decoration and catering are separate.', ['hall']],
      ['Hall + Guest Rooms', 65000, '2 days', 'Hall for two days with 10 rooms for the family.', ['Hall for 2 days', '10 AC rooms', 'Bridal & groom rooms'], null, ['hall', 'decor']],
    ]],
  ['saroj', 'Saroj Makeup & Bridal Studio', 'makeup', 'Bridal, engagement and party makeup with hair styling and saree draping. Trial available before the wedding. We also travel to your venue.', 'Boisar, Palghar, Tarapur', 3000, 7, [IMG.makeup1, IMG.makeup2, IMG.hair], true,
    ['Bridal Makeup', 'Hair Stylist', 'Saree Draping', 'Mehendi Artist'], [
      ['Bridal Makeup Package', 15000, '3 hours', 'Complete HD bridal look for the wedding day, with hair and draping.', ['HD / airbrush makeup', 'Hair styling with accessories', 'Saree / dupatta draping', 'Touch-up kit'], 'Trial makeup is ₹1,500 (adjusted if you book).', ['makeup1', 'makeup3', 'hair']],
      ['Engagement Makeup Package', 8000, '2 hours', 'A soft glam look for the engagement ceremony.', ['HD makeup', 'Hair styling', 'Saree draping'], null, ['makeup1', 'makeup2']],
      ['Reception Makeup Package', 10000, '2.5 hours', 'A bold evening look for the reception.', ['HD makeup', 'Hair styling / curls', 'Lashes'], null, ['makeup3', 'hair']],
      ['Haldi Makeup Package', 4000, '1 hour', 'A light, natural look for the haldi.', ['Light makeup', 'Simple hairstyle', 'Flower styling'], null, ['makeup2']],
      ['Party Makeup Package', 3000, '1 hour', 'Quick party makeup for guests and family members.', ['Makeup', 'Basic hairstyle'], 'Groups of 4 or more get a discount.', ['makeup2', 'makeup3']],
    ]],
  ['dinesh', 'Pimple Guruji – Vivah & Pooja Services', 'pandit-rituals', 'Experienced pandit for vivah, griha pravesh, satyanarayan pooja and more. Kundali matching and muhurat guidance. All materials can be arranged.', 'Nashik, Palghar, Thane', 1100, 20, [IMG.flowers, IMG.rings], false,
    ['Pandit', 'Pooja Services', 'Kundali Matching', 'Muhurat Consultation', 'Havan'], [
      ['Vivah Sanskar – Full Ceremony', 11000, 'Full ceremony', 'The complete Marathi vivah vidhi with mantras explained in simple language.', ['Pandit & assistant', 'All wedding rituals', 'Pooja material list', 'Muhurat guidance'], 'Samagri can be arranged for an extra charge.', ['flowers', 'rings']],
      ['Satyanarayan Pooja', 3100, '2 hours', 'Satyanarayan katha and pooja at your home.', ['Pandit', 'Katha & aarti', 'Prasad guidance'], null, ['flowers']],
      ['Griha Pravesh Pooja', 5100, '3 hours', 'Vastu shanti and griha pravesh with havan.', ['Pandit', 'Vastu pooja', 'Havan'], null, ['flowers']],
      ['Kundali Matching & Muhurat', 1100, '45 minutes', 'Gun-milan and an auspicious date for the wedding.', ['Kundali matching', 'Muhurat suggestions'], 'Birth details of both sides are needed.', ['rings']],
    ]],
  ['meena', 'Patil Boutique & Jewellers', 'clothes-jewellery', 'Bridal lehengas, paithani sarees and traditional Maharashtrian jewellery on rent or for sale. Fitting and alterations in-house.', 'Vasai, Virar, Nalasopara', 5000, 9, [IMG.clothes, IMG.pearls, IMG.bracelet], false,
    ['Bridal Lehenga', 'Wedding Sarees', 'Traditional Jewellery', 'Dress Rental'], [
      ['Bridal Lehenga on Rent', 12000, '3 days', 'Designer lehenga with blouse and dupatta, altered to fit.', ['Lehenga set', 'Fitting & alterations', 'Dry cleaning'], 'Refundable deposit of ₹10,000.', ['clothes']],
      ['Traditional Jewellery Set (Rent)', 5000, '3 days', 'Nath, haar, bangles and earrings for the bride.', ['Nath', 'Long haar', 'Bangles', 'Earrings'], null, ['pearls', 'bracelet', 'earrings']],
      ['Paithani Saree Collection', 9000, 'Per saree (rent)', 'Handwoven-look paithani sarees for the wedding.', ['Saree', 'Blouse stitching', 'Draping help'], null, ['clothes']],
    ]],
  ['santosh', 'Sankhe Wedding Cars & Buses', 'transportation', 'Decorated wedding cars, guest buses and tempo travellers with experienced drivers.', 'Wada, Palghar, Vasai', 6000, 12, [IMG.car, IMG.suv], false,
    ['Wedding Car Rental', 'Decorated Cars', 'Bus Rental', 'Tempo Traveller'], [
      ['Decorated Wedding Car', 6000, '8 hours', 'A flower-decorated car for the couple.', ['Car with driver', 'Flower decoration', 'Fuel within 50 km'], null, ['car']],
      ['Guest Bus (50 seats)', 18000, 'Full day', 'AC bus to take guests from the venue to the hall.', ['AC bus', 'Driver & helper', 'Fuel within 100 km'], null, ['suv']],
      ['Tempo Traveller (12 seats)', 7000, 'Full day', 'Comfortable tempo traveller for family members.', ['12-seater', 'Driver', 'Fuel within 80 km'], null, ['suv', 'car']],
    ]],
  ['ashwini', 'Sankhe Cards & Digital Invites', 'invitations-printing', 'Wedding invitation cards, WhatsApp video invitations, banners and welcome boards. Design proofs shared before printing.', 'Palghar, Boisar, Dahanu', 1500, 8, [IMG.gifts, IMG.rings], false,
    ['Wedding Invitation Cards', 'Digital Invitations', 'WhatsApp Video Invitations', 'Wedding Banners'], [
      ['Premium Invitation Cards (100)', 6000, '5 days', 'Laminated card with gold foil, envelope and Marathi / English text.', ['Design proof', '100 cards', 'Envelopes', 'Free delivery in Palghar'], null, ['gifts']],
      ['WhatsApp Video Invitation', 1500, '2 days', 'A short animated invitation for sharing on WhatsApp.', ['Custom design', 'Your photos & music', 'HD video'], null, ['rings']],
      ['Banner & Welcome Boards', 3500, '2 days', 'Flex banner, welcome board and mandap name board.', ['Flex banner', 'Welcome board', 'Name boards'], null, ['gifts', 'rings']],
    ]],
  ['ganesh', 'Pimple Wedding Planners', 'planning-management', 'We plan and run your wedding from the first call to the last guest — vendors, schedule, decoration, food and guests.', 'Thane, Palghar, Mumbai', 25000, 10, [IMG.couple, IMG.table], true,
    ['Wedding Planner', 'Event Manager', 'Wedding Coordinator', 'Complete Wedding Packages'], [
      ['Day-of Coordination', 25000, 'Wedding day', 'A coordinator and team run the schedule so the family can relax.', ['Coordinator + 3 helpers', 'Vendor coordination', 'Guest management'], null, ['table']],
      ['Complete Wedding Planning', 125000, '3 months', 'Full planning: venue, vendors, budget, decor, food, invites and the wedding day.', ['Planning meetings', 'Vendor booking', 'Budget tracking', 'On-site team', 'All rituals schedule'], 'Vendor charges are billed separately.', ['couple', 'table']],
    ]],
  ['vijay', 'Patil Tent, Chairs & Generator Rental', 'other-services', 'Chairs, tables, tents, coolers and generators for weddings and functions. Delivery and set-up included.', 'Palghar, Boisar, Vasai', 4500, 6, [IMG.balloons, IMG.decor], false,
    ['Chairs & Tables Rental', 'Generator', 'AC/Cooler Rental'], [
      ['200 Chairs + 10 Tables', 6000, 'Per day', 'Plastic chairs and tables with delivery and pick-up.', ['200 chairs', '10 tables', 'Delivery & pick-up'], null, ['balloons']],
      ['25 kVA Generator', 4500, 'Per day', 'Silent generator with operator. Fuel extra.', ['Generator', 'Operator', 'Cables'], 'Diesel is charged at actual.', ['decor']],
    ]],
];

// owner key, type, name, details
const ACHIEVEMENTS = [
  ['sunita', 'ACADEMIC', 'Sakshi Patil', { schoolName: 'Zilla Parishad School, Palghar', grade: '10th', percentage: 94.2, year: 2025, description: 'Topped her school in the 10th board exams and wants to become a doctor.' }],
  ['rahul', 'ACADEMIC', 'Omkar Sankhe', { schoolName: 'Junior College, Boisar', grade: '12th', stream: 'Science', percentage: 91.5, year: 2025, description: 'Scored 91.5% in HSC Science and cleared the engineering entrance exam.' }],
  ['pooja', 'ACADEMIC', 'Ankita Vade', { schoolName: 'Vasai Girls High School', grade: '10th', percentage: 89.8, year: 2025, description: 'Won the district-level science exhibition and scored 89.8% in the board exams.' }],
  ['amit', 'ACADEMIC', 'Tejas Pimple', { schoolName: 'Dahanu High School', grade: '10th', percentage: 92.0, year: 2024, description: 'A dairy farmer’s son who studies by the cow shed lamp — 92% in SSC.' }],
  ['snehal', 'PROFESSIONAL', 'CA Snehal Patil', { role: 'Chartered Accountant', company: 'Own practice', city: 'Pune', description: 'Cleared CA in the first attempt and now helps small businesses with accounts and tax.' }],
  ['nilesh', 'PROFESSIONAL', 'Nilesh Vade', { role: 'Senior Software Engineer', company: 'A product company', city: 'Mumbai', description: 'Mentors students from the community who want to start a tech career.' }],
  ['pooja', 'PROFESSIONAL', 'Pooja Vade', { role: 'Staff Nurse', company: 'District hospital', city: 'Vasai', description: 'Recognised for 5 years of dedicated patient care.' }],
  ['rahul', 'PROFESSIONAL', 'Er. Rahul Sankhe', { role: 'Civil Engineer', company: 'Sankhe Construction', city: 'Boisar', description: 'Started with a single site; now employs 20 people from nearby villages.' }],
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
  const [members, posts, businesses, services, achievements, packages, matrimony] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: SAMPLE_DOMAIN } } }),
    prisma.post.count({ where: { author: { email: { endsWith: SAMPLE_DOMAIN } } } }),
    prisma.business.count({ where }),
    prisma.serviceProvider.count({ where }),
    prisma.achievement.count({ where }),
    prisma.servicePackage.count({ where: { provider: where } }),
    prisma.profile.count({ where: { isDemo: true, isMatrimonial: true } }),
  ]);
  return { members, posts, businesses, services, achievements, packages, matrimony, present: members > 0 };
}

/** Adds (or tops up) the sample content. Safe to run twice — nothing is duplicated. */
export async function addSampleContent() {
  const ids = {};
  for (const [i, [key, name, gender, city, village, occupation, year, bio]] of MEMBERS.entries()) {
    const email = emailOf(key);
    const url = PORTRAIT[key] ? portrait(PORTRAIT[key]) : avatar(name, BG[i % BG.length]);
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
  let packages = 0;
  const cats = new Map((await prisma.serviceCategory.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]));
  for (const [i, [key, businessName, slug, description, location, priceFrom, experienceYears, photos, isFeatured, subs = [], pkgs = []]] of SERVICES.entries()) {
    if (!cats.has(slug)) continue;
    let provider = await prisma.serviceProvider.findFirst({ where: { userId: ids[key], businessName }, select: { id: true } });
    if (!provider) {
      const subRows = await prisma.serviceSubcategory.findMany({ where: { categoryId: cats.get(slug), key: { in: subs.map(nameKey) } }, select: { id: true } });
      provider = await prisma.serviceProvider.create({
        data: { userId: ids[key], businessName, categoryId: cats.get(slug), description, location, phone: '0000000000', priceFrom, experienceYears, photos: photos.map((p) => photo(p)), status: 'APPROVED', isFeatured, createdAt: daysAgo(60 + i), subcategories: { connect: subRows } },
        select: { id: true },
      });
      services++;
    }
    for (const [j, [name, price, duration, description2, includes, details, pphotos]] of pkgs.entries()) {
      if (await have('servicePackage', { providerId: provider.id, name })) continue;
      await prisma.servicePackage.create({ data: { providerId: provider.id, name, price, duration, description: description2, includes, details, photos: pphotos.map((k) => photo(IMG[k])), sortOrder: j } });
      packages++;
    }
  }

  // matrimony samples (tagged, no contact details, cannot be followed or messaged)
  let matrimony = 0;
  for (const [i, [key, name, gender, year, city, heightCm, degree, occupation, annualIncome, gotra, familyType, bio]] of MATRIMONY.entries()) {
    const email = emailOf(key);
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) continue;
    const url = PORTRAIT[key] ? portrait(PORTRAIT[key]) : avatar(name, BG[(i + 1) % BG.length]);
    await prisma.user.create({
      data: {
        email,
        role: 'USER',
        intents: ['MATRIMONY'],
        lastActiveAt: daysAgo(i % 4),
        createdAt: daysAgo(30 - i),
        profile: {
          create: {
            fullName: name, gender, dateOfBirth: new Date(`${year}-0${(i % 8) + 1}-1${i % 9}`), heightCm,
            currentCity: city, currentState: 'Maharashtra', nativeVillage: city, education: degree, occupation, annualIncome,
            degrees: [{ degree, institute: 'University of Mumbai', year: year + 22 }], bio,
            gotra, familyType, siblingsCount: 1 + (i % 3), fatherOccupation: i % 2 ? 'Farmer' : 'Government employee',
            prefAgeMin: 24, prefAgeMax: 32, prefLocation: 'Maharashtra',
            profilePhotoUrl: url, profilePhotoBlurUrl: url,
            isMatrimonial: true, isVerified: true, accountType: 'PUBLIC', isDemo: true, createdAt: daysAgo(30 - i),
          },
        },
      },
    });
    matrimony++;
  }

  // groom samples: every detail filled in, several photos each
  for (const [i, g] of GROOMS.entries()) {
    const email = emailOf(g.key);
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) continue;
    const chart = computeBirthChart(g.dob, g.tob);
    const main = tall(g.photos[0]);
    const urls = g.photos.map(tall);
    await prisma.user.create({
      data: {
        email,
        role: 'USER',
        intents: ['MATRIMONY'],
        lastActiveAt: daysAgo(i % 3),
        createdAt: daysAgo(12 - i),
        profile: {
          create: {
            fullName: g.name, gender: 'MALE', dateOfBirth: new Date(`${g.dob}T00:00:00Z`), maritalStatus: 'NEVER_MARRIED', heightCm: g.height, weightKg: g.weight, bloodGroup: g.blood, bodyType: g.body,
            physicalStatus: 'Fully fit', createdBy: i % 2 ? 'Parents' : 'Self',
            currentCity: g.city, currentDistrict: g.district, currentState: 'Maharashtra', currentCountry: 'India', nativeVillage: g.village, nativeDistrict: 'Palghar', nativeState: 'Maharashtra',
            motherTongue: 'Marathi', languages: g.languages, religion: 'Hindu', community: 'Vanjari', gotra: g.gotra, devak: g.devak, kuldaivat: g.kuldaivat,
            education: g.quals.map((q) => q.degree).join(', ').slice(0, 120), degrees: g.quals, highestQualification: g.highest,
            employmentType: g.employment, occupation: g.occupation, jobDesignation: g.designation ?? null, companyName: g.company ?? null, workingCity: g.workCity ?? null, experienceYears: g.exp ?? null,
            businessName: g.business ?? null, businessType: g.bizType ?? null, businessYears: g.bizYears ?? null, annualIncome: g.income,
            workDetails: g.business ? `${g.business} — ${g.bizYears} years in business.` : `${g.designation}, ${g.exp} years of experience.`,
            fatherName: g.father, fatherOccupation: g.fatherJob, motherName: g.mother, motherOccupation: g.motherJob, familyType: g.familyType,
            brothers: g.brothers, marriedBrothers: g.marriedBrothers, sisters: g.sisters, marriedSisters: g.marriedSisters, siblingsCount: g.brothers + g.sisters,
            familyValues: g.values, aboutFamily: g.aboutFamily, diet: g.diet, drinking: g.drinking, smoking: g.smoking, hobbies: g.hobbies, interests: g.interests,
            bio: g.bio, careerGoals: g.goals, marriageExpectations: g.expect,
            timeOfBirth: g.tob, placeOfBirth: g.city, rashi: chart.rashi.name, nakshatra: chart.nakshatra.name,
            prefAgeMin: g.prefAge[0], prefAgeMax: g.prefAge[1], prefEducation: g.prefEdu, prefLocation: g.prefLoc, prefOccupation: g.prefJob, prefName: g.prefName,
            profilePhotoUrl: main, profilePhotoBlurUrl: main,
            isMatrimonial: true, isVerified: true, accountType: 'PUBLIC', isDemo: true, createdAt: daysAgo(12 - i),
            photos: { create: urls.map((url, k) => ({ url, blurUrl: url, sortOrder: k })) },
          },
        },
      },
    });
    matrimony++;
  }

  let achievements = 0;
  for (const [i, [key, type, name, details]] of ACHIEVEMENTS.entries()) {
    if (await have('achievement', { userId: ids[key], name })) continue;
    const pic = type === 'PROFESSIONAL' && PORTRAIT[key] ? portrait(PORTRAIT[key]) : photo(i % 2 ? IMG.study : IMG.books, 600);
    await prisma.achievement.create({ data: { userId: ids[key], type, name, photoUrl: pic, isVerified: true, createdAt: daysAgo(20 - i), ...details } });
    achievements++;
  }
  return { ...(await sampleStatus()), added: { posts, businesses, services, achievements, packages, matrimony } };
}

/** Removes every sample user — and with them their profiles, posts, listings and achievements. */
export async function removeSampleContent() {
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: SAMPLE_DOMAIN } } });
  return { removed: count, ...(await sampleStatus()) };
}

/**
 * Sample accounts added by an older version (any cartoon avatar left) are rebuilt once with the current
 * names and portraits. Only sample users are touched. Returns true when it rebuilt them.
 */
export async function refreshOldSampleContent() {
  const old = await prisma.profile.findFirst({ where: { isDemo: true, profilePhotoUrl: { contains: 'dicebear' }, user: { email: { endsWith: SAMPLE_DOMAIN } } }, select: { id: true } });
  if (old) {
    await removeSampleContent();
    await addSampleContent();
    return true;
  }
  // sample content is on but newer sample profiles (e.g. the grooms) are missing: add just those (nothing is duplicated)
  if ((await prisma.user.count({ where: { email: { endsWith: SAMPLE_DOMAIN } } })) > 0) {
    const have = await prisma.user.count({ where: { email: { in: GROOMS.map((g) => emailOf(g.key)) } } });
    if (have < GROOMS.length) {
      await addSampleContent();
      return true;
    }
  }
  return false;
}
