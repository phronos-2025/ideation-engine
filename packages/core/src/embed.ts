/**
 * Corpus embedding pipeline (Phase 2 M2). Turns an owner's text into `chunk`
 * rows the brainstorm worker retrieves over.
 *
 * `embedOwner` is the unit of work behind both the `embed.upsert` pg-boss job
 * and the one-shot backfill script: it loads an owner's text, chunks it, embeds
 * the chunks via the model router, and **replaces** that owner's chunk rows
 * (delete-then-insert in one transaction). Embedding (a possible network call)
 * happens outside the transaction so a connection isn't held open across it.
 */

import { and, eq } from 'drizzle-orm';
import { type Db, annotation, chunk, node } from '@phronos/db';
import { activeEmbedModel, embed } from '@phronos/llm';

/** The two owner kinds that carry embeddable text today (node body, note body). */
export type EmbedOwnerType = 'node' | 'annotation';

/** Payload for the `embed.upsert` job and the enqueue hooks. */
export interface EmbedJob {
  ownerType: EmbedOwnerType;
  ownerId: string;
}

/** Max characters per chunk before we split. */
const MAX_CHUNK_CHARS = 1000;

/**
 * Split text into chunks of at most `maxChars`, preferring paragraph breaks.
 * A paragraph longer than the limit is hard-split. Empty/whitespace text yields
 * no chunks (so re-embedding cleared text simply removes the owner's chunks).
 */
export function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let cur = '';
  const flush = () => {
    if (cur) chunks.push(cur);
    cur = '';
  };
  for (const para of paragraphs) {
    if (para.length > maxChars) {
      flush();
      for (let i = 0; i < para.length; i += maxChars) chunks.push(para.slice(i, i + maxChars));
      continue;
    }
    if (cur && cur.length + para.length + 2 > maxChars) flush();
    cur = cur ? `${cur}\n\n${para}` : para;
  }
  flush();
  return chunks;
}

/** Load the embeddable text for an owner, or null if it's gone / empty. */
async function loadOwnerText(db: Db, target: EmbedJob): Promise<string | null> {
  if (target.ownerType === 'node') {
    const rows = await db
      .select({ body: node.body })
      .from(node)
      .where(eq(node.id, target.ownerId))
      .limit(1);
    return rows[0]?.body ?? null;
  }
  const rows = await db
    .select({ body: annotation.body })
    .from(annotation)
    .where(eq(annotation.id, target.ownerId))
    .limit(1);
  return rows[0]?.body ?? null;
}

/**
 * Re-embed one owner: replace its `chunk` rows with freshly embedded chunks of
 * its current text. Returns the number of chunks written. Idempotent — running
 * it twice on unchanged text yields the same rows (stub embedder is
 * deterministic). Safe if the owner was deleted: it just clears stale chunks.
 */
export async function embedOwner(db: Db, target: EmbedJob): Promise<number> {
  const text = await loadOwnerText(db, target);
  const chunks = text ? chunkText(text) : [];
  const model = activeEmbedModel();
  const vectors = chunks.length > 0 ? await embed(model, chunks) : [];

  await db.transaction(async (tx) => {
    await tx
      .delete(chunk)
      .where(and(eq(chunk.ownerType, target.ownerType), eq(chunk.ownerId, target.ownerId)));
    if (chunks.length > 0) {
      await tx.insert(chunk).values(
        chunks.map((text, i) => ({
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          text,
          embedding: vectors[i]!,
          embedModel: model,
        })),
      );
    }
  });

  return chunks.length;
}
