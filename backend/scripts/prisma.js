/**
 * Runs the Prisma CLI with DATABASE_URL built from DB_NAME / DB_PASSWORD in backend/.env.
 *   node scripts/prisma.js migrate dev
 * (The npm db:* scripts use this, so you normally never call it directly.)
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import '../src/config/load-env.js';

if (!process.env.DATABASE_URL) {
  console.error('✖ Set DB_NAME and DB_PASSWORD (or DATABASE_URL) in backend/.env');
  process.exit(1);
}

const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
const { status } = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(status ?? 1);
