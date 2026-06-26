import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql, eq } from 'drizzle-orm';
import { createDb, event, annotation, type Db } from '@phronos/db';
import { createActions, type Actions } from './actions.js';
import { systemContext } from './context.js';
import { CycleError, NotFoundError } from './errors.js';

const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
const ctx = systemContext();

// Integration tests run against a migrated database. Skip cleanly if none is set.
const d = url ? describe : describe.skip;

d('action layer', () => {
  // Lazily connect in beforeAll so a skipped run (no DATABASE_URL) never touches
  // createDb at collection time.
  let db: Db;
  let close: () => Promise<void>;
  let actions: Actions;
  beforeAll(() => {
    ({ db, close } = createDb(url!));
    actions = createActions(db);
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE node, edge, annotation, chunk, event RESTART IDENTITY CASCADE`);
  });
  afterAll(async () => {
    await close();
  });

  const countEvents = async (action?: string) => {
    const rows = action
      ? await db.select().from(event).where(eq(event.action, action))
      : await db.select().from(event);
    return rows.length;
  };

  it('createNode persists and writes exactly one event', async () => {
    const id = await actions.createNode(ctx, { label: 'Idea', tier: 'goal' });
    const got = await actions.getNode(id);
    expect(got.label).toBe('Idea');
    expect(got.phase).toBe('divergent');
    expect(await countEvents()).toBe(1);
    expect(await countEvents('createNode')).toBe(1);
  });

  it('setPhase updates phase and logs an event', async () => {
    const id = await actions.createNode(ctx, { label: 'X', tier: 'goal' });
    await actions.setPhase(ctx, id, 'operational');
    expect((await actions.getNode(id)).phase).toBe('operational');
    expect(await countEvents('updateNode')).toBe(1);
  });

  it('rejects a contains cycle', async () => {
    const a = await actions.createNode(ctx, { label: 'A', tier: 'realm' });
    const b = await actions.createNode(ctx, { label: 'B', tier: 'realm' });
    await actions.linkEdge(ctx, { sourceId: a, targetId: b, type: 'contains' });
    await expect(
      actions.linkEdge(ctx, { sourceId: b, targetId: a, type: 'contains' }),
    ).rejects.toBeInstanceOf(CycleError);
    await expect(
      actions.linkEdge(ctx, { sourceId: a, targetId: a, type: 'contains' }),
    ).rejects.toBeInstanceOf(CycleError);
  });

  it('linkEdge is idempotent on the unique key (no duplicate event)', async () => {
    const a = await actions.createNode(ctx, { label: 'A', tier: 'realm' });
    const b = await actions.createNode(ctx, { label: 'B', tier: 'realm' });
    const e1 = await actions.linkEdge(ctx, { sourceId: a, targetId: b, type: 'cross' });
    const e2 = await actions.linkEdge(ctx, { sourceId: a, targetId: b, type: 'cross' });
    expect(e1).toBe(e2);
    expect(await countEvents('linkEdge')).toBe(1);
  });

  it('supports multi-supernode membership', async () => {
    const m = await actions.createNode(ctx, { label: 'Member', tier: 'goal' });
    const s1 = await actions.createSupernode(ctx, { label: 'S1', memberIds: [m] });
    const s2 = await actions.createSupernode(ctx, { label: 'S2', memberIds: [] });
    await actions.addToSupernode(ctx, s2, m);
    const { edges } = await actions.getGraph({ includeArchived: true });
    const containsForM = edges.filter((e) => e.type === 'contains' && e.targetId === m);
    expect(containsForM).toHaveLength(2);
    expect(new Set(containsForM.map((e) => e.sourceId))).toEqual(new Set([s1, s2]));
  });

  it('archiveNode hides from the default graph but keeps the row', async () => {
    const id = await actions.createNode(ctx, { label: 'Temp', tier: 'goal' });
    await actions.archiveNode(ctx, id);
    const { nodes } = await actions.getGraph();
    expect(nodes.find((n) => n.id === id)).toBeUndefined();
    const all = await actions.getGraph({ includeArchived: true });
    expect(all.nodes.find((n) => n.id === id)).toBeDefined();
  });

  it('deleteNode cascades polymorphic annotations', async () => {
    const id = await actions.createNode(ctx, { label: 'WithNote', tier: 'goal' });
    await actions.addNote(ctx, { ownerType: 'node', ownerId: id, body: 'a note' });
    expect(await actions.listAnnotations('node', id)).toHaveLength(1);
    await actions.deleteNode(ctx, id);
    expect(await actions.listAnnotations('node', id)).toHaveLength(0);
    await expect(actions.getNode(id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('addNote attaches text and logs an event', async () => {
    const id = await actions.createNode(ctx, { label: 'N', tier: 'goal' });
    const aId = await actions.addNote(ctx, { ownerType: 'node', ownerId: id, body: 'hello' });
    const [row] = await db.select().from(annotation).where(eq(annotation.id, aId));
    expect(row?.body).toBe('hello');
    expect(row?.kind).toBe('note');
    expect(await countEvents('addNote')).toBe(1);
  });
});
