/**
 * Starter content for a NEW live database — safe to run any number of times, never deletes anything
 * and creates no demo accounts:
 *   - wedding-service categories (Music & DJ, Halls, Makeup, Catering, Photography, Decoration)
 *   - the researched Palghar Vanjari history entries
 *   - indicative muhurat dates
 *
 *   npm run db:starter   (from backend/, after `npm run db:deploy`)
 *
 * The first admin account is created automatically the first time an address from ADMIN_EMAILS
 * signs in at /admin/login.
 */
import '../src/config/load-env.js';
import { PrismaClient } from '@prisma/client';
import { HISTORY } from './history-data.js';
import { CATEGORIES, MUHURAT, MUHURAT_TITLES } from './reference-data.js';

const prisma = new PrismaClient();
try {
  for (const c of CATEGORIES) await prisma.serviceCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });

  const haveTitles = new Set((await prisma.historyEntry.findMany({ select: { title: true } })).map((h) => h.title));
  const history = HISTORY.filter((h) => !haveTitles.has(h.title));
  if (history.length) await prisma.historyEntry.createMany({ data: history });

  const muhurat = await prisma.muhuratDate.createMany({
    data: MUHURAT.map(([date, type]) => ({
      date: new Date(`${date}T00:00:00Z`),
      type,
      title: MUHURAT_TITLES[type],
      notes: 'Indicative date — please confirm timing with your family priest or local panchang.',
    })),
    skipDuplicates: true,
  });

  console.log(`✔ Starter content ready: ${CATEGORIES.length} service categories, ${history.length} history entries added, ${muhurat.count} muhurat dates added`);
} catch (err) {
  console.error('✖ Could not add starter content:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
