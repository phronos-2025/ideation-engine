import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql, and, eq } from 'drizzle-orm';
import { createDb, chunk, runChunk, type Db } from '@phronos/db';
import { STUB_EMBED_MODEL, embed } from '@phronos/llm';
import { createActions, type Actions } from './actions.js';
import { embedOwner } from './embed.js';
import { runBrainstorm, scopeConstrainedANN, type Generate } from './brainstorm.js';
import { systemContext } from './context.js';

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const ctx = systemContext();
const d = url ? describe : describe.skip;

/** A generator stub — no API key needed. Echoes the model so we can assert on it. */
const stubGenerate: Generate = async (model) => ({
  text: `draft for ${model}`,
  usage: { inputTokens: 1, outputTokens: 1 },
  model,
  stopReason: 'end_turn',
});

d('brainstorm (DB)', () => {
  let db: Db;
  let close: () => Promise<void>;
  let actions: Actions;
  beforeAll(() => {
    ({ db, close } = createDb(url!));
    actions = createActions(db);
  });
  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE node, edge, annotation, chunk, event, run, run_chunk, output RESTART IDENTITY CASCADE`,
    );
  });
  afterAll(async () => {
    await close();
  });

  const countEvents = async (action: string) =>
    (await db.execute(sql`SELECT count(*)::int AS n FROM event WHERE action = ${action}`))
      .rows[0] as unknown as { n: number };

  it('enqueueBrainstorm freezes scope, queues a run, writes one event, kicks the worker', async () => {
    const enqueueBrainstormRun = vi.fn();
    const a = createActions(db, { enqueueBrainstormRun });
    const n1 = await a.createNode(ctx, { label: 'A', tier: 'goal', body: 'alpha' });
    const n2 = await a.createNode(ctx, { label: 'B', tier: 'goal', body: 'beta' });

    const runId = await a.enqueueBrainstorm(ctx, {
      nodeIds: [n1, n2],
      prompt: 'what next?',
      model: 'claude-sonnet-4-6',
    });

    const got = await a.getRun(runId);
    expect(got.status).toBe('queued');
    expect(got.model).toBe('claude-sonnet-4-6');
    expect(got.embedModel).toBe(STUB_EMBED_MODEL);
    expect(new Set((got.scopeSnapshot as { nodeIds: string[] }).nodeIds)).toEqual(new Set([n1, n2]));
    expect((await countEvents('enqueueBrainstorm')).n).toBe(1);
    expect(enqueueBrainstormRun).toHaveBeenCalledTimes(1);
    expect(enqueueBrainstormRun).toHaveBeenCalledWith({ runId });
  });

  it('a supernode scope expands to its members', async () => {
    const m1 = await actions.createNode(ctx, { label: 'M1', tier: 'goal' });
    const m2 = await actions.createNode(ctx, { label: 'M2', tier: 'goal' });
    const superId = await actions.createSupernode(ctx, { label: 'S', memberIds: [m1, m2] });
    const runId = await actions.enqueueBrainstorm(ctx, {
      scopeId: superId,
      prompt: 'p',
      model: 'claude-opus-4-8',
    });
    const snap = (await actions.getRun(runId)).scopeSnapshot as { nodeIds: string[] };
    expect(new Set(snap.nodeIds)).toEqual(new Set([m1, m2]));
  });

  it('runBrainstorm writes a draft output, run_chunk provenance, and marks the run done', async () => {
    const n1 = await actions.createNode(ctx, { label: 'A', tier: 'goal', body: 'alpha alpha alpha' });
    await embedOwner(db, { ownerType: 'node', ownerId: n1 });
    const runId = await actions.enqueueBrainstorm(ctx, {
      nodeIds: [n1],
      prompt: 'p',
      model: 'claude-sonnet-4-6',
    });

    await runBrainstorm(db, stubGenerate, runId);

    const got = await actions.getRun(runId);
    expect(got.status).toBe('done');
    expect(got.completedAt).not.toBeNull();
    expect(got.outputs).toHaveLength(1);
    expect(got.outputs[0]!.rawBody).toBe('draft for claude-sonnet-4-6');
    expect(got.outputs[0]!.status).toBe('draft');
    const rc = await db.select().from(runChunk).where(eq(runChunk.runId, runId));
    expect(rc.length).toBeGreaterThan(0);
    expect(rc.every((r) => r.rank !== null && r.score !== null)).toBe(true);
  });

  it('scope-constrained ANN excludes out-of-scope chunks', async () => {
    const inScope = await actions.createNode(ctx, { label: 'IN', tier: 'goal', body: 'in scope text' });
    const outScope = await actions.createNode(ctx, { label: 'OUT', tier: 'goal', body: 'out of scope text' });
    await embedOwner(db, { ownerType: 'node', ownerId: inScope });
    await embedOwner(db, { ownerType: 'node', ownerId: outScope });

    const [qv] = await embed(STUB_EMBED_MODEL, ['query text']);
    const hits = await scopeConstrainedANN(db, [inScope], qv!, 10);

    const inIds = new Set(
      (
        await db
          .select({ id: chunk.id })
          .from(chunk)
          .where(and(eq(chunk.ownerType, 'node'), eq(chunk.ownerId, inScope)))
      ).map((c) => c.id),
    );
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => inIds.has(h.id))).toBe(true);
  });

  it('marks the run failed (with error) when generation throws', async () => {
    const failing: Generate = async () => {
      throw new Error('boom');
    };
    const n1 = await actions.createNode(ctx, { label: 'A', tier: 'goal', body: 'x x x' });
    await embedOwner(db, { ownerType: 'node', ownerId: n1 });
    const runId = await actions.enqueueBrainstorm(ctx, {
      nodeIds: [n1],
      prompt: 'p',
      model: 'claude-sonnet-4-6',
    });

    await expect(runBrainstorm(db, failing, runId)).rejects.toThrow('boom');

    const got = await actions.getRun(runId);
    expect(got.status).toBe('failed');
    expect(got.error).toContain('boom');
    expect(got.outputs).toHaveLength(0);
  });
});
