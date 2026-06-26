/**
 * Brainstorm run: retrieval + generation (Phase 2 M3, ARCH §7.1).
 *
 * `runBrainstorm` is the body of the `embed`-adjacent `brainstorm.run` pg-boss
 * job. It's written as a plain function with the **generator injected** so the
 * worker passes real Claude (`@phronos/llm` `generate`) and tests pass a stub —
 * the retrieval, provenance, and status logic is verifiable without a key.
 *
 * Flow: resolve the frozen scope → gather direct context (FK walk) → embed the
 * prompt → scope-constrained ANN over `chunk` → record `run_chunk` provenance →
 * assemble (direct + retrieved + prompt) → generate → write a draft `output` and
 * mark the run done (or failed + error).
 */

import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import {
  type Db,
  annotation,
  chunk,
  edge,
  node,
  nodeSource,
  output,
  run,
  runChunk,
  source,
} from '@phronos/db';
import { embed, type GenerateRequest, type GenerateResult } from '@phronos/llm';

/** The injected generator — matches `@phronos/llm`'s `generate` exactly. */
export type Generate = (modelId: string, req: GenerateRequest) => Promise<GenerateResult>;

/** Payload for the `brainstorm.run` job. */
export interface BrainstormRunJob {
  runId: string;
}

/** How many retrieved chunks to feed the generator. */
const TOP_K = 8;

const SYSTEM_PROMPT =
  'You are a research brainstorming partner working over a structured idea graph. ' +
  'You are given the scope (the ideas in focus and their notes), retrieved related ' +
  'material, and a prompt. Respond with concrete, well-reasoned ideas grounded in the ' +
  'provided context. Be specific; do not invent sources.';

/**
 * Resolve a scope spec to a frozen, deduped set of node ids. A supernode expands
 * to its `contains` members (one level); an empty supernode falls back to itself.
 * Ad-hoc `nodeIds` are used directly. Filtered to nodes that actually exist.
 */
export async function resolveScope(
  db: Db,
  spec: { scopeId?: string; nodeIds?: string[] },
): Promise<string[]> {
  let candidate: string[];
  if (spec.nodeIds?.length) {
    candidate = spec.nodeIds;
  } else if (spec.scopeId) {
    const children = await db
      .select({ id: edge.targetId })
      .from(edge)
      .where(and(eq(edge.type, 'contains'), eq(edge.sourceId, spec.scopeId)));
    candidate = children.length > 0 ? children.map((c) => c.id) : [spec.scopeId];
  } else {
    return [];
  }
  const unique = [...new Set(candidate)];
  const existing = await db
    .select({ id: node.id })
    .from(node)
    .where(inArray(node.id, unique));
  const present = new Set(existing.map((n) => n.id));
  return unique.filter((id) => present.has(id));
}

/**
 * Direct context (ARCH §7.1): each scope node's label + body, its `note`
 * annotations, and its linked sources' abstracts (empty pre-Zotero). Returns a
 * single formatted block.
 */
async function gatherDirectContext(db: Db, nodeIds: string[]): Promise<string> {
  const nodes = await db
    .select({ id: node.id, label: node.label, body: node.body })
    .from(node)
    .where(inArray(node.id, nodeIds));
  const notes = await db
    .select({ ownerId: annotation.ownerId, body: annotation.body })
    .from(annotation)
    .where(
      and(
        eq(annotation.ownerType, 'node'),
        inArray(annotation.ownerId, nodeIds),
        eq(annotation.kind, 'note'),
      ),
    );
  const sources = await db
    .select({ nodeId: nodeSource.nodeId, title: source.title, abstract: source.abstract })
    .from(nodeSource)
    .innerJoin(source, eq(nodeSource.sourceId, source.id))
    .where(inArray(nodeSource.nodeId, nodeIds));

  const notesByNode = new Map<string, string[]>();
  for (const n of notes) {
    const list = notesByNode.get(n.ownerId) ?? [];
    list.push(n.body);
    notesByNode.set(n.ownerId, list);
  }
  const sourcesByNode = new Map<string, string[]>();
  for (const s of sources) {
    if (!s.abstract && !s.title) continue;
    const list = sourcesByNode.get(s.nodeId) ?? [];
    list.push([s.title, s.abstract].filter(Boolean).join(' — '));
    sourcesByNode.set(s.nodeId, list);
  }

  const blocks: string[] = [];
  for (const n of nodes) {
    const parts = [`## ${n.label}`];
    if (n.body) parts.push(n.body);
    const ns = notesByNode.get(n.id);
    if (ns?.length) parts.push(`Notes:\n${ns.map((b) => `- ${b}`).join('\n')}`);
    const ss = sourcesByNode.get(n.id);
    if (ss?.length) parts.push(`Sources:\n${ss.map((b) => `- ${b}`).join('\n')}`);
    blocks.push(parts.join('\n'));
  }
  return blocks.join('\n\n');
}

export interface RetrievedChunk {
  id: string;
  text: string;
  score: number;
}

/**
 * Scope-constrained ANN: order `chunk` rows owned by the scope nodes (+ their
 * annotations + linked sources) by cosine distance to the query vector, top-k.
 * Out-of-scope chunks are never considered.
 */
export async function scopeConstrainedANN(
  db: Db,
  nodeIds: string[],
  queryVec: number[],
  k = TOP_K,
): Promise<RetrievedChunk[]> {
  const anns = await db
    .select({ id: annotation.id })
    .from(annotation)
    .where(and(eq(annotation.ownerType, 'node'), inArray(annotation.ownerId, nodeIds)));
  const annIds = anns.map((a) => a.id);
  const srcs = await db
    .select({ id: nodeSource.sourceId })
    .from(nodeSource)
    .where(inArray(nodeSource.nodeId, nodeIds));
  const srcIds = srcs.map((s) => s.id);

  const scopeConds: SQL[] = [
    and(eq(chunk.ownerType, 'node'), inArray(chunk.ownerId, nodeIds)) as SQL,
  ];
  if (annIds.length > 0) {
    scopeConds.push(and(eq(chunk.ownerType, 'annotation'), inArray(chunk.ownerId, annIds)) as SQL);
  }
  if (srcIds.length > 0) {
    scopeConds.push(and(eq(chunk.ownerType, 'source'), inArray(chunk.ownerId, srcIds)) as SQL);
  }

  const vec = `[${queryVec.join(',')}]`;
  const distance = sql<number>`${chunk.embedding} <=> ${vec}::vector`;
  return db
    .select({ id: chunk.id, text: chunk.text, score: distance })
    .from(chunk)
    .where(or(...scopeConds))
    .orderBy(distance)
    .limit(k);
}

/** Assemble the single user message: direct context + retrieved + the prompt. */
function assemblePrompt(direct: string, retrieved: string[], prompt: string): string {
  const sections: string[] = [];
  if (direct.trim()) sections.push(`# Scope\n${direct}`);
  if (retrieved.length > 0) {
    sections.push(`# Retrieved context\n${retrieved.map((t) => `- ${t}`).join('\n')}`);
  }
  sections.push(`# Prompt\n${prompt}`);
  return sections.join('\n\n');
}

/**
 * Execute one brainstorm run. Idempotent enough for at-least-once delivery: a
 * re-run inserts a fresh `output` and refreshes `run_chunk`. Throws on failure
 * after marking the run `failed` (so pg-boss also sees the error).
 */
export async function runBrainstorm(db: Db, generate: Generate, runId: string): Promise<void> {
  const runRow = (await db.select().from(run).where(eq(run.id, runId)).limit(1))[0];
  if (!runRow) throw new Error(`run ${runId} not found`);

  try {
    const nodeIds = (runRow.scopeSnapshot as { nodeIds?: string[] } | null)?.nodeIds ?? [];
    if (nodeIds.length === 0) throw new Error('run has an empty scope snapshot');

    const direct = await gatherDirectContext(db, nodeIds);
    const [queryVec] = await embed(runRow.embedModel, [runRow.prompt]);
    const retrieved = await scopeConstrainedANN(db, nodeIds, queryVec!, TOP_K);

    const assembled = assemblePrompt(
      direct,
      retrieved.map((r) => r.text),
      runRow.prompt,
    );
    const result = await generate(runRow.model, {
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: assembled }],
      params: (runRow.params as GenerateRequest['params']) ?? undefined,
    });

    await db.transaction(async (tx) => {
      // Refresh provenance, then write the draft and close the run.
      await tx.delete(runChunk).where(eq(runChunk.runId, runId));
      if (retrieved.length > 0) {
        await tx.insert(runChunk).values(
          retrieved.map((r, i) => ({ runId, chunkId: r.id, score: r.score, rank: i })),
        );
      }
      await tx.insert(output).values({ runId, rawBody: result.text, status: 'draft' });
      await tx.update(run).set({ status: 'done', completedAt: new Date() }).where(eq(run.id, runId));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(run)
      .set({ status: 'failed', error: message, completedAt: new Date() })
      .where(eq(run.id, runId));
    throw err;
  }
}
