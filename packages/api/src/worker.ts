import PgBoss from 'pg-boss';
import { env } from './env.js';

/**
 * Background worker (Railway). Phase 0 stands it up with a placeholder queue so
 * the wiring is verified; the real jobs — Zotero sync (Phase 1) and async
 * brainstorm runs (Phase 2) — register here against the same pg-boss instance.
 */
async function main(): Promise<void> {
  const boss = new PgBoss(env.databaseUrl());
  boss.on('error', (err) => console.error('pg-boss error', err));
  await boss.start();
  await boss.createQueue('noop');
  await boss.work('noop', async () => {
    /* no-op until Phases 1-2 */
  });
  console.log('Phronos worker started (pg-boss).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
