import { serve } from '@hono/node-server';
import PgBoss from 'pg-boss';
import { createActions } from '@phronos/core';
import { createDb } from '@phronos/db';
import { createApp } from './app.js';
import { env } from './env.js';

/**
 * API service (Railway). Owns the write path and enqueues background work. The
 * producer-side pg-boss here sends `embed.upsert` jobs that the worker consumes;
 * enqueue is best-effort and never faults a mutation (Phase 2 M2).
 */
async function main(): Promise<void> {
  const { db } = createDb(env.databaseUrl());

  const boss = new PgBoss(env.databaseUrl());
  boss.on('error', (err) => console.error('pg-boss error', err));
  await boss.start();
  await boss.createQueue('embed.upsert');

  const actions = createActions(db, {
    enqueueEmbed: (job) => {
      void boss
        .send('embed.upsert', job)
        .catch((err) => console.error('embed enqueue failed', err));
    },
  });
  const app = createApp(actions);
  const port = env.port();

  serve({ fetch: app.fetch, port });
  console.log(`Phronos API listening on :${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
