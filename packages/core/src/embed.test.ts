import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql, and, eq } from 'drizzle-orm';
import { createDb, chunk, type Db } from '@phronos/db';
import { STUB_EMBED_MODEL } from '@phronos/llm';
import { createActions } from './actions.js';
import { chunkText, embedOwner } from './embed.js';
import { systemContext } from './context.js';

describe('chunkText', () => {
  it('returns nothing for empty/whitespace text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    expect(chunkText('a short idea')).toEqual(['a short idea']);
  });

  it('splits on paragraph breaks and packs within the limit', () => {
    // Joined length is 11, so it fits in one chunk under a 20-char limit...
    expect(chunkText('alpha\n\nbeta', 20)).toEqual(['alpha\n\nbeta']);
    // ...but splits per paragraph when the limit can't hold both.
    expect(chunkText('alpha\n\nbeta', 6)).toEqual(['alpha', 'beta']);
  });

  it('hard-splits a paragraph longer than the limit', () => {
    const chunks = chunkText('x'.repeat(25), 10);
    expect(chunks).toEqual(['x'.repeat(10), 'x'.repeat(10), 'x'.repeat(5)]);
  });
});

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const ctx = systemContext();
const d = url ? describe : describe.skip;

d('embedding pipeline (DB)', () => {
  // Lazily connect in beforeAll so a skipped run (no DATABASE_URL) never touches
  // createDb at collection time.
  let db: Db;
  let close: () => Promise<void>;
  beforeAll(() => {
    ({ db, close } = createDb(url!));
  });
  beforeEach(async () => {
    await db.execute(sql`TRUNCATE node, edge, annotation, chunk, event RESTART IDENTITY CASCADE`);
  });
  afterAll(async () => {
    await close();
  });

  const chunksFor = (ownerType: 'node' | 'annotation', ownerId: string) =>
    db
      .select()
      .from(chunk)
      .where(and(eq(chunk.ownerType, ownerType), eq(chunk.ownerId, ownerId)));

  it('embedOwner writes chunks with the embed_model stamped', async () => {
    const actions = createActions(db);
    const id = await actions.createNode(ctx, { label: 'N', tier: 'goal', body: 'a body to embed' });
    const written = await embedOwner(db, { ownerType: 'node', ownerId: id });
    const rows = await chunksFor('node', id);
    expect(written).toBe(rows.length);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.embedModel === STUB_EMBED_MODEL)).toBe(true);
    expect(rows.every((r) => r.embedding?.length === 1024)).toBe(true);
  });

  it('embedOwner replaces an owner’s prior chunks (no accumulation)', async () => {
    const actions = createActions(db);
    const id = await actions.createNode(ctx, { label: 'N', tier: 'goal', body: 'first text' });
    await embedOwner(db, { ownerType: 'node', ownerId: id });
    const before = await chunksFor('node', id);
    // Change the body and re-embed; old chunks must be gone, not appended.
    await db.execute(sql`UPDATE node SET body = 'a completely different body now' WHERE id = ${id}`);
    await embedOwner(db, { ownerType: 'node', ownerId: id });
    const after = await chunksFor('node', id);
    expect(after.some((r) => before.some((b) => b.id === r.id))).toBe(false);
  });

  it('embedOwner clears chunks when text becomes empty', async () => {
    const actions = createActions(db);
    const id = await actions.createNode(ctx, { label: 'N', tier: 'goal', body: 'will be cleared' });
    await embedOwner(db, { ownerType: 'node', ownerId: id });
    await db.execute(sql`UPDATE node SET body = NULL WHERE id = ${id}`);
    const written = await embedOwner(db, { ownerType: 'node', ownerId: id });
    expect(written).toBe(0);
    expect(await chunksFor('node', id)).toHaveLength(0);
  });

  it('enqueues an embed only when a node has body, with one event written', async () => {
    const enqueueEmbed = vi.fn();
    const actions = createActions(db, { enqueueEmbed });

    const withBody = await actions.createNode(ctx, { label: 'B', tier: 'goal', body: 'text' });
    const noBody = await actions.createNode(ctx, { label: 'N', tier: 'goal' });

    expect(enqueueEmbed).toHaveBeenCalledTimes(1);
    expect(enqueueEmbed).toHaveBeenCalledWith({ ownerType: 'node', ownerId: withBody });
    expect(enqueueEmbed).not.toHaveBeenCalledWith({ ownerType: 'node', ownerId: noBody });
  });

  it('enqueues on note add, note update, and node body change', async () => {
    const enqueueEmbed = vi.fn();
    const actions = createActions(db, { enqueueEmbed });
    const nodeId = await actions.createNode(ctx, { label: 'N', tier: 'goal' });

    const noteId = await actions.addNote(ctx, { ownerType: 'node', ownerId: nodeId, body: 'note' });
    await actions.updateAnnotation(ctx, noteId, 'edited note');
    await actions.updateNode(ctx, nodeId, { body: 'now has a body' });
    await actions.updateNode(ctx, nodeId, { label: 'renamed only' });

    expect(enqueueEmbed.mock.calls.map(([j]) => j)).toEqual([
      { ownerType: 'annotation', ownerId: noteId },
      { ownerType: 'annotation', ownerId: noteId },
      { ownerType: 'node', ownerId: nodeId },
    ]);
  });

  it('is best-effort: a throwing enqueuer never faults the mutation', async () => {
    const actions = createActions(db, {
      enqueueEmbed: () => {
        throw new Error('queue down');
      },
    });
    const id = await actions.createNode(ctx, { label: 'B', tier: 'goal', body: 'text' });
    expect((await actions.getNode(id)).label).toBe('B');
    const events = await db.execute(sql`SELECT count(*)::int AS n FROM event`);
    expect((events.rows[0] as { n: number }).n).toBe(1);
  });
});
