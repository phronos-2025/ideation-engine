/**
 * Minimal forward-only SQL migration runner.
 *
 * Applies every `.sql` file in `migrations/` (lexical order) that hasn't been
 * applied yet, each inside its own transaction, recording applied filenames in
 * a `_migrations` table. We run DDL over a DIRECT (unpooled) connection because
 * PgBouncer transaction-mode pooling chokes on session-level statements like
 * CREATE EXTENSION.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

async function run(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL to run migrations.');
  }

  const client = new pg.Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS _migrations (
         filename   text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );

    const applied = new Set(
      (await client.query<{ filename: string }>('SELECT filename FROM _migrations')).rows.map(
        (r) => r.filename,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      process.stdout.write(`Applying ${file} ... `);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        process.stdout.write('done\n');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        process.stdout.write('failed\n');
        throw err;
      }
    }

    console.log(count === 0 ? 'No pending migrations.' : `Applied ${count} migration(s).`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
