/**
 * Starter content for a NEW live database — safe to run any number of times, never deletes real data
 * and creates no demo accounts:
 *   - wedding-service categories with their subcategories (venues, DJ & music, pandit, catering, photography, decoration, makeup, clothes, transport, invitations, planning, other)
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
import { CATEGORIES, MUHURAT, MUHURAT_TITLES, syncServiceCategories } from './reference-data.js';
import { refreshOldSampleContent } from '../src/services/sample-content.js';

const prisma = new PrismaClient();
try {
  const cats = await syncServiceCategories(prisma);

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

  // sample accounts made by an older version (cartoon avatars, other surnames) are rebuilt once — real accounts are never touched
  const refreshed = await refreshOldSampleContent();
  if (refreshed) console.log('✔ Sample content refreshed (community surnames + portraits)');

  console.log(`✔ Starter content ready: ${CATEGORIES.length} service categories (${cats.categories} new, ${cats.subcategories} new subcategories), ${history.length} history entries added, ${muhurat.count} muhurat dates added`);
} catch (err) {
  console.error('✖ Could not add starter content:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
