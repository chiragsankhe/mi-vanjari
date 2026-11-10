/**
 * Replaces the original placeholder history entries with the researched Palghar Vanjari history,
 * without touching anything else in the database (entries an admin added are kept).
 *   npm run db:history  (from backend/)
 */
import '../src/config/load-env.js';
import { PrismaClient } from '@prisma/client';
import { HISTORY, PLACEHOLDER_TITLES } from '../prisma/history-data.js';

const prisma = new PrismaClient();
try {
  const removed = await prisma.historyEntry.deleteMany({ where: { title: { in: PLACEHOLDER_TITLES }, imageUrl: null } });
  const existing = new Set((await prisma.historyEntry.findMany({ select: { title: true } })).map((h) => h.title));
  const toAdd = HISTORY.filter((h) => !existing.has(h.title));
  if (toAdd.length) await prisma.historyEntry.createMany({ data: toAdd });
  console.log(`✔ History updated: removed ${removed.count} placeholder entries, added ${toAdd.length} entries`);
} catch (err) {
  console.error('✖ Could not update history:', err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
