/**
 * Community history timeline — the Vanjari samaj of Palghar.
 * Used by prisma/seed.js and scripts/update-history.js. Admins can edit everything later in Admin → History.
 *
 * Sources (community tradition is labelled as such in the text):
 *  - Wikipedia: "Palghar", "Boisar", "Vanjari caste"
 *  - Vanjari Samaj community pages (24 villages, surnames, caravan trade, Boisar samaj hall)
 */
export const HISTORY = [
  {
    era: 'ORIGIN · मूळ',
    yearRange: 'Ancient – medieval',
    title: 'मेवाडची मुळे',
    titleEn: 'Roots in Mewar, Rajasthan',
    content:
      'By community tradition, the Vanjaris of Palghar trace their roots to Chittorgarh in Mewar, Rajasthan. The name is usually traced to the Sanskrit vanij — merchant — and inscriptions from 12th-century Rajasthan already mention Vanajaraka traders. Our own dialect still carries Rajasthani and Gujarati words, a living link to that past.',
    sortOrder: 1,
  },
  {
    era: 'TRADE CARAVANS · तांडे',
    yearRange: 'Medieval – 19th century',
    title: 'बैलांचे तांडे',
    titleEn: 'The bullock-caravan traders',
    content:
      'For generations our ancestors were long-distance traders. Bands of herders drove caravans (tandas) of pack-bullocks loaded with rice, wheat and dried fish — over the Sahyadri ghats to the Konkan; to Surat, Navsari and Kalyan in the west; and inland as far as Nagpur and Jabalpur.',
    sortOrder: 2,
  },
  {
    era: 'KONKAN COAST · कोकण',
    yearRange: '18th – 19th century',
    title: 'मोरडी बंदर',
    titleEn: 'Trading at Moradi port',
    content:
      'On the Konkan coast the caravan routes met the sea at Moradi — today’s Murbe, near Boisar — where grain and goods were exchanged with coastal boats. This port trade is what drew our families to the country around Boisar.',
    sortOrder: 3,
  },
  {
    era: 'TURNING POINT · वळण',
    yearRange: '1853 onwards',
    title: 'आगगाडी आली',
    titleEn: 'The railway changes everything',
    content:
      'India’s first passenger train ran from Bombay to Thane on 16 April 1853, and railways soon spread across the region. Bullock caravans could not compete with trains, and the old long-distance grain trade faded. Families used their savings to buy land and settled for good.',
    sortOrder: 4,
  },
  {
    era: 'SETTLEMENT · वस्ती',
    yearRange: '19th – 20th century',
    title: 'चोवीस गावे',
    titleEn: 'Twenty-four villages',
    content:
      'The community took to farming and became known for hard work on paddy fields, vegetables and orchards. Today it lives in 24 villages of Palghar district: Bandhan, Boisar, Dapoli, Dedale, Dhuktan, Eklare, Gundavali, Kalovlee, Kambalgao, Kolgaon, Kolwade, Kondan, Kumbhavali, Kurgaon, Manor-Ambhan, Maswan, Morekuran, Murabe, Pam, Parnali, Patharali, Tembhi, Uparale and Vengani. Common surnames include Sankhe, Pimple, Patil, Vade and Bore.',
    sortOrder: 5,
  },
  {
    era: 'EDUCATION & INDUSTRY · प्रगती',
    yearRange: '1960s onwards',
    title: 'शिक्षण आणि उद्योग',
    titleEn: 'Education and industry',
    content:
      'Tarapur Atomic Power Station — India’s first nuclear power station, commissioned in 1969 — and the Tarapur MIDC industrial area transformed Boisar. A first generation of graduates became teachers, engineers, doctors and public servants, and many families started businesses. The Thane Zilla Vanjari Samaj Hitwardhak Mandal and the samaj hall at Boisar became centres of community life.',
    sortOrder: 6,
  },
  {
    era: 'TODAY · आज',
    yearRange: '2014 – today',
    title: 'आजची नवी पिढी',
    titleEn: 'Today’s new generation',
    content:
      'In 2014 Palghar became a district of its own. Our families now live across India and around the world — building careers and businesses while staying connected to home, to each other and to the traditions of our 24 villages through platforms like Mi Vanjari.',
    sortOrder: 7,
  },
];

/** Titles of the original placeholder entries (replaced by scripts/update-history.js). */
export const PLACEHOLDER_TITLES = ['पूर्वजांची वाटचाल', 'पालघरमध्ये वस्ती', 'परंपरा आणि संस्कृती', 'शिक्षणाची वाट', 'आजची नवी पिढी'];
