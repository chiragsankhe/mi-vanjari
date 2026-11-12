import { prisma } from '../lib/prisma.js';

/**
 * Sample content — so a new visitor sees how the site looks when it is busy.
 *
 * Honest by design:
 *  • everything is tagged "Sample" in the site (Profile.isDemo)
 *  • people have illustrated avatars, never real photos; names and stories are made up
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
  ['saroj', 'Saroj Waghmare', 'FEMALE', 'Boisar', 'Chilhar', 'Makeup artist', 1992, 'Bridal and party makeup artist. A happy bride is my best advertisement.'],
  ['dinesh', 'Dinesh Joshi', 'MALE', 'Nashik', 'Trimbak', 'Pandit & purohit', 1979, 'Performing vivah, griha pravesh and satyanarayan poojas for 20 years.'],
  ['meena', 'Meena Gawde', 'FEMALE', 'Vasai', 'Virar', 'Boutique & jewellery owner', 1986, 'Bridal wear and traditional jewellery on rent and for sale.'],
  ['ganesh', 'Ganesh Raut', 'MALE', 'Thane', 'Murbad', 'Wedding planner', 1988, 'I plan weddings so that families can enjoy them.'],
  ['ashwini', 'Ashwini Bhagat', 'FEMALE', 'Palghar', 'Saphale', 'Printing & invitation cards', 1990, 'Invitation cards, banners and digital invites, delivered on time.'],
];

// Matrimony samples — key, name, gender, birth year, city, height cm, degree, occupation, income, gotra, family, bio
const MATRIMONY = [
  ['m-riya', 'Riya Patil', 'FEMALE', 1998, 'Palghar', 160, 'B.Sc. Nursing', 'Staff nurse', '₹3–5 lakh', 'Kashyap', 'JOINT', 'Sample profile. Family-oriented, loves cooking and classical dance.'],
  ['m-neha', 'Neha Shinde', 'FEMALE', 1996, 'Thane', 163, 'MBA (HR)', 'HR executive', '₹6–8 lakh', 'Vatsa', 'NUCLEAR', 'Sample profile. Working in Thane; enjoys travel and music.'],
  ['m-komal', 'Komal Gaikwad', 'FEMALE', 1999, 'Vasai', 158, 'B.Ed.', 'School teacher', '₹3–4 lakh', 'Bharadwaj', 'JOINT', 'Sample profile. Loves teaching and long walks by the sea.'],
  ['m-akash', 'Akash Jadhav', 'MALE', 1995, 'Boisar', 175, 'B.E. Mechanical', 'Production engineer', '₹6–8 lakh', 'Kashyap', 'JOINT', 'Sample profile. Engineer, cricket lover, close with his family.'],
  ['m-rohan', 'Rohan Pawar', 'MALE', 1993, 'Nashik', 178, 'B.Com., MBA', 'Bank manager', '₹8–10 lakh', 'Vatsa', 'NUCLEAR', 'Sample profile. Bank manager who enjoys trekking and photography.'],
  ['m-yogesh', 'Yogesh More', 'MALE', 1994, 'Dahanu', 172, 'B.Sc. Agriculture', 'Farmer & dairy owner', '₹5–7 lakh', 'Bharadwaj', 'JOINT', 'Sample profile. Modern farmer with a dairy business and a big heart.'],
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

// owner key, name, category slug, description, location, priceFrom, years, photos, featured, subcategories, packages
// package = [name, price, duration, description, services included, details, photos]
const SERVICES = [
  ['prakash', 'Waghmare Catering – Weddings & Functions', 'catering', 'Traditional Maharashtrian wedding menus, live counters and sweets. Hygienic kitchen, trained serving staff. Tasting before you book.', 'Nashik, Palghar, Thane', 350, 12, [IMG.buffet, IMG.plated], true,
    ['Wedding Caterers', 'Maharashtrian Food', 'Veg Catering', 'Live Food Counters'], [
      ['Classic Veg Thali (per plate)', 350, 'Minimum 200 plates', 'A full Maharashtrian vegetarian wedding thali served buffet style.', ['2 sabzi + 1 usal', 'Varan bhaat, poli, puri', 'Two sweets', 'Salad, papad, pickle', 'Buttermilk'], 'Serving staff and utensils included. Tasting on request.', ['buffet']],
      ['Premium Wedding Menu (per plate)', 550, 'Minimum 150 plates', 'A grand menu with starters, live counters and desserts for the big day.', ['Welcome drink', '3 starters', 'Live chaat & pav-bhaji counter', 'Full thali with 3 sweets', 'Ice cream'], 'Decorated counters and uniformed staff included.', ['plated', 'buffet']],
      ['Haldi & Sakharpuda Snacks (per plate)', 180, 'Up to 100 guests', 'Light snacks and tea for small functions.', ['Misal pav / vada pav', 'Sheera', 'Tea & coffee'], null, ['plated']],
    ]],
  ['manisha', 'Manisha Dhumal Photography', 'photography', 'Candid wedding photography and cinematic videos. Pre-wedding shoots, albums and same-week sneak peeks.', 'Thane, Mumbai, Palghar', 25000, 8, [IMG.camera, IMG.camera2], true,
    ['Wedding Photographer', 'Pre-Wedding Shoot', 'Cinematic Video', 'Wedding Albums'], [
      ['Wedding Day Photography', 25000, 'Full day (10 hours)', 'Candid and traditional photography of all wedding rituals.', ['2 photographers', 'Unlimited photos', '300 edited photos', 'Online gallery'], 'Travel outside Thane charged extra.', ['camera', 'camera2']],
      ['Photo + Cinematic Video', 45000, 'Full day', 'Photography plus a cinematic highlight film and full ceremony video.', ['2 photographers + 1 videographer', '5-minute highlight film', 'Full ceremony video', '30-page album'], null, ['camera2', 'camera']],
      ['Pre-Wedding Shoot', 12000, '4 hours', 'An outdoor shoot for the couple at a location near you.', ['1 location', '50 edited photos', '1-minute reel'], 'Outfit changes up to 3.', ['couple']],
    ]],
  ['vijay', 'Kharat Sound & DJ', 'dj-music', 'Powerful sound, lights and DJ for sangeet, haldi and baraat. Banjo and dhol groups arranged on request.', 'Palghar, Boisar, Vasai', 15000, 6, [IMG.concert, IMG.concert2], false,
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
  ['santosh', 'Pawar Mangal Karyalay', 'wedding-halls', 'Spacious hall with dining area, bridal rooms and parking for 200 vehicles. Generator backup.', 'Wada', 40000, 15, [IMG.hall, IMG.decor], false,
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
  ['dinesh', 'Joshi Guruji – Vivah & Pooja Services', 'pandit-rituals', 'Experienced pandit for vivah, griha pravesh, satyanarayan pooja and more. Kundali matching and muhurat guidance. All materials can be arranged.', 'Nashik, Palghar, Thane', 1100, 20, [IMG.flowers, IMG.rings], false,
    ['Pandit', 'Pooja Services', 'Kundali Matching', 'Muhurat Consultation', 'Havan'], [
      ['Vivah Sanskar – Full Ceremony', 11000, 'Full ceremony', 'The complete Marathi vivah vidhi with mantras explained in simple language.', ['Pandit & assistant', 'All wedding rituals', 'Pooja material list', 'Muhurat guidance'], 'Samagri can be arranged for an extra charge.', ['flowers', 'rings']],
      ['Satyanarayan Pooja', 3100, '2 hours', 'Satyanarayan katha and pooja at your home.', ['Pandit', 'Katha & aarti', 'Prasad guidance'], null, ['flowers']],
      ['Griha Pravesh Pooja', 5100, '3 hours', 'Vastu shanti and griha pravesh with havan.', ['Pandit', 'Vastu pooja', 'Havan'], null, ['flowers']],
      ['Kundali Matching & Muhurat', 1100, '45 minutes', 'Gun-milan and an auspicious date for the wedding.', ['Kundali matching', 'Muhurat suggestions'], 'Birth details of both sides are needed.', ['rings']],
    ]],
  ['meena', 'Gawde Boutique & Jewellers', 'clothes-jewellery', 'Bridal lehengas, paithani sarees and traditional Maharashtrian jewellery on rent or for sale. Fitting and alterations in-house.', 'Vasai, Virar, Nalasopara', 5000, 9, [IMG.clothes, IMG.pearls, IMG.bracelet], false,
    ['Bridal Lehenga', 'Wedding Sarees', 'Traditional Jewellery', 'Dress Rental'], [
      ['Bridal Lehenga on Rent', 12000, '3 days', 'Designer lehenga with blouse and dupatta, altered to fit.', ['Lehenga set', 'Fitting & alterations', 'Dry cleaning'], 'Refundable deposit of ₹10,000.', ['clothes']],
      ['Traditional Jewellery Set (Rent)', 5000, '3 days', 'Nath, haar, bangles and earrings for the bride.', ['Nath', 'Long haar', 'Bangles', 'Earrings'], null, ['pearls', 'bracelet', 'earrings']],
      ['Paithani Saree Collection', 9000, 'Per saree (rent)', 'Handwoven-look paithani sarees for the wedding.', ['Saree', 'Blouse stitching', 'Draping help'], null, ['clothes']],
    ]],
  ['santosh', 'Pawar Wedding Cars & Buses', 'transportation', 'Decorated wedding cars, guest buses and tempo travellers with experienced drivers.', 'Wada, Palghar, Vasai', 6000, 12, [IMG.car, IMG.suv], false,
    ['Wedding Car Rental', 'Decorated Cars', 'Bus Rental', 'Tempo Traveller'], [
      ['Decorated Wedding Car', 6000, '8 hours', 'A flower-decorated car for the couple.', ['Car with driver', 'Flower decoration', 'Fuel within 50 km'], null, ['car']],
      ['Guest Bus (50 seats)', 18000, 'Full day', 'AC bus to take guests from the venue to the hall.', ['AC bus', 'Driver & helper', 'Fuel within 100 km'], null, ['suv']],
      ['Tempo Traveller (12 seats)', 7000, 'Full day', 'Comfortable tempo traveller for family members.', ['12-seater', 'Driver', 'Fuel within 80 km'], null, ['suv', 'car']],
    ]],
  ['ashwini', 'Bhagat Cards & Digital Invites', 'invitations-printing', 'Wedding invitation cards, WhatsApp video invitations, banners and welcome boards. Design proofs shared before printing.', 'Palghar, Boisar, Dahanu', 1500, 8, [IMG.gifts, IMG.rings], false,
    ['Wedding Invitation Cards', 'Digital Invitations', 'WhatsApp Video Invitations', 'Wedding Banners'], [
      ['Premium Invitation Cards (100)', 6000, '5 days', 'Laminated card with gold foil, envelope and Marathi / English text.', ['Design proof', '100 cards', 'Envelopes', 'Free delivery in Palghar'], null, ['gifts']],
      ['WhatsApp Video Invitation', 1500, '2 days', 'A short animated invitation for sharing on WhatsApp.', ['Custom design', 'Your photos & music', 'HD video'], null, ['rings']],
      ['Banner & Welcome Boards', 3500, '2 days', 'Flex banner, welcome board and mandap name board.', ['Flex banner', 'Welcome board', 'Name boards'], null, ['gifts', 'rings']],
    ]],
  ['ganesh', 'Raut Wedding Planners', 'planning-management', 'We plan and run your wedding from the first call to the last guest — vendors, schedule, decoration, food and guests.', 'Thane, Palghar, Mumbai', 25000, 10, [IMG.couple, IMG.table], true,
    ['Wedding Planner', 'Event Manager', 'Wedding Coordinator', 'Complete Wedding Packages'], [
      ['Day-of Coordination', 25000, 'Wedding day', 'A coordinator and team run the schedule so the family can relax.', ['Coordinator + 3 helpers', 'Vendor coordination', 'Guest management'], null, ['table']],
      ['Complete Wedding Planning', 125000, '3 months', 'Full planning: venue, vendors, budget, decor, food, invites and the wedding day.', ['Planning meetings', 'Vendor booking', 'Budget tracking', 'On-site team', 'All rituals schedule'], 'Vendor charges are billed separately.', ['couple', 'table']],
    ]],
  ['vijay', 'Kharat Tent, Chairs & Generator Rental', 'other-services', 'Chairs, tables, tents, coolers and generators for weddings and functions. Delivery and set-up included.', 'Palghar, Boisar, Vasai', 4500, 6, [IMG.balloons, IMG.decor], false,
    ['Chairs & Tables Rental', 'Generator', 'AC/Cooler Rental'], [
      ['200 Chairs + 10 Tables', 6000, 'Per day', 'Plastic chairs and tables with delivery and pick-up.', ['200 chairs', '10 tables', 'Delivery & pick-up'], null, ['balloons']],
      ['25 kVA Generator', 4500, 'Per day', 'Silent generator with operator. Fuel extra.', ['Generator', 'Operator', 'Cables'], 'Diesel is charged at actual.', ['decor']],
    ]],
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
    const url = avatar(name, BG[(i + 1) % BG.length]);
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

  let achievements = 0;
  for (const [i, [key, type, name, details]] of ACHIEVEMENTS.entries()) {
    if (await have('achievement', { userId: ids[key], name })) continue;
    await prisma.achievement.create({ data: { userId: ids[key], type, name, photoUrl: avatar(name, BG[(i + 2) % BG.length]), isVerified: true, createdAt: daysAgo(20 - i), ...details } });
    achievements++;
  }
  return { ...(await sampleStatus()), added: { posts, businesses, services, achievements, packages, matrimony } };
}

/** Removes every sample user — and with them their profiles, posts, listings and achievements. */
export async function removeSampleContent() {
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: SAMPLE_DOMAIN } } });
  return { removed: count, ...(await sampleStatus()) };
}
