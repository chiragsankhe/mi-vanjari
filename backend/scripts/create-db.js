/**
 * Creates the database named in DB_NAME (or DATABASE_URL) if it does not exist yet.
 *   npm run db:create
 */
import '../src/config/load-env.js';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('✖ Set DB_NAME and DB_PASSWORD (or DATABASE_URL) in backend/.env');
  process.exit(1);
}
const url = new URL(process.env.DATABASE_URL);
const dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
  console.error(`Refusing to create database with unusual name: ${dbName}`);
  process.exit(1);
}

url.pathname = '/postgres';
url.search = '';
const client = new pg.Client({ connectionString: url.toString() });

try {
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rowCount) console.log(`✔ Database "${dbName}" already exists`);
  else {
    await client.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
    console.log(`✔ Created database "${dbName}"`);
  }
} catch (err) {
  console.error('✖ Could not create database:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
