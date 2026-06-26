/**
 * One-shot corpus backfill (Phase 2 M2). Embeds the text that already exists —
 * every node with a `body` and every annotation — so the retrieval corpus is
 * populated for nodes/notes created before the `embed.upsert` job existed (e.g.
 * the seed graph). Going forward the verbs enqueue embeds on text change; this
 * just covers the historical gap.
 *
 * Idempotent: `embedOwner` replaces an owner's chunks, so re-running is safe.
 *
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/phronos \
 *     pnpm --filter @phronos/core exec tsx src/embed-backfill.ts
 */
import { and, isNotNull, ne } from 'drizzle-orm';
import { annotation, createDb, node } from '@phronos/db';
import { activeEmbedModel } from '@phronos/llm';
import { embedOwner } from './embed.js';

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Set DATABASE_URL to backfill embeddings.');
  const { db, close } = createDb(connectionString);

  try {
    console.log(`Backfilling embeddings with model: ${activeEmbedModel()}`);

    const nodes = await db
      .select({ id: node.id })
      .from(node)
      .where(and(isNotNull(node.body), ne(node.body, '')));
    let nodeChunks = 0;
    for (const n of nodes) nodeChunks += await embedOwner(db, { ownerType: 'node', ownerId: n.id });
    console.log(`  nodes: ${nodes.length} owners -> ${nodeChunks} chunks`);

    const anns = await db.select({ id: annotation.id }).from(annotation);
    let annChunks = 0;
    for (const a of anns) {
      annChunks += await embedOwner(db, { ownerType: 'annotation', ownerId: a.id });
    }
    console.log(`  annotations: ${anns.length} owners -> ${annChunks} chunks`);

    console.log('Backfill complete.');
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
