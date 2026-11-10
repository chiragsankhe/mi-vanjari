/**
 * Loads backend/.env and builds DATABASE_URL from the separate DB_* fields.
 *
 * Prisma only understands a single DATABASE_URL, so if it isn't set directly we assemble it from:
 *   DB_NAME      (required)
 *   DB_PASSWORD  (required)
 *   DB_USER      (optional, default "postgres")
 *   DB_HOST      (optional, default "localhost")
 *   DB_PORT      (optional, default 5432)
 *
 * A DATABASE_URL that is set explicitly (e.g. by a hosting provider) always wins.
 * Import this file first in anything that talks to the database: the server, scripts and the seed.
 */
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export function buildDatabaseUrl(e = process.env) {
  if (e.DATABASE_URL) return e.DATABASE_URL;
  if (!e.DB_NAME || e.DB_PASSWORD === undefined) return '';

  const user = encodeURIComponent(e.DB_USER || 'postgres');
  const password = encodeURIComponent(e.DB_PASSWORD); // special characters like @ # / are safe
  const host = e.DB_HOST || 'localhost';
  const port = e.DB_PORT || '5432';
  const name = encodeURIComponent(e.DB_NAME);
  return `postgresql://${user}:${password}@${host}:${port}/${name}?schema=public`;
}

const url = buildDatabaseUrl();
if (url) process.env.DATABASE_URL = url;
// Migrations need a direct (non-pooled) connection. Without a separate one, use the same address.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) process.env.DIRECT_URL = process.env.DATABASE_URL;
