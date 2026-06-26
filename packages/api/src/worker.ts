import PgBoss from 'pg-boss';
import { createDb } from '@phronos/db';
import { embedOwner, type EmbedJob } from '@phronos/core';
import { env } from './env.js';

/**
 * Background worker (Railway). Registers async jobs against the shared pg-boss
 * instance. Phase 2 M2 adds `embed.upsert` (re-embed an owner's corpus chunks);
 * the brainstorm run job lands in M5 against the same boss.
 */
async function main(): Promise<void> {
  const boss = new PgBoss(env.databaseUrl());
  boss.on('error', (err) => console.error('pg-boss error', err));
  await boss.start();

  const { db } = createDb(env.databaseUrl());

  await boss.createQueue('embed.upsert');
  await boss.work<EmbedJob>('embed.upsert', async (jobs) => {
    for (const job of jobs) await embedOwner(db, job.data);
  });

  console.log('Phronos worker started (pg-boss): embed.upsert.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
