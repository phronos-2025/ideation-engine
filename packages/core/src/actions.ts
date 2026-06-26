import { and, eq, inArray } from 'drizzle-orm';
import {
  type Db,
  node,
  edge,
  annotation,
  chunk,
  event,
} from '@phronos/db';
import type { ActorContext } from './context.js';
import type { EmbedJob } from './embed.js';
import { CycleError, NotFoundError } from './errors.js';
import {
  addNoteInput,
  createNodeInput,
  createSupernodeInput,
  getGraphFilter,
  linkEdgeInput,
  updateNodeInput,
  type GetGraphFilter,
} from './schemas.js';

/** The transaction handle type, derived from the Drizzle client. */
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

interface EventInput {
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: unknown;
}

/** Write the single event row for a mutation, stamped with the actor context. */
async function writeEvent(tx: Tx, ctx: ActorContext, e: EventInput): Promise<void> {
  await tx.insert(event).values({
    actorType: ctx.actorType,
    actorId: ctx.actorId ?? null,
    action: e.action,
    targetType: e.targetType ?? null,
    targetId: e.targetId ?? null,
    payload: (e.payload ?? null) as object | null,
    simRunId: ctx.simRunId ?? null,
    sessionId: ctx.sessionId ?? null,
  });
}

async function assertNodeExists(tx: Tx, id: string): Promise<void> {
  const rows = await tx.select({ id: node.id }).from(node).where(eq(node.id, id)).limit(1);
  if (rows.length === 0) throw new NotFoundError(`node ${id}`);
}

/**
 * True if adding a `contains` edge sourceId -> targetId would create a cycle:
 * i.e. targetId already (transitively) contains sourceId. Recursive descent
 * over `contains` edges from targetId (ARCHITECTURE §6 linkEdge contract).
 */
async function wouldCreateContainsCycle(
  tx: Tx,
  sourceId: string,
  targetId: string,
): Promise<boolean> {
  if (sourceId === targetId) return true;
  const seen = new Set<string>();
  let frontier = [targetId];
  while (frontier.length > 0) {
    const rows = await tx
      .select({ t: edge.targetId })
      .from(edge)
      .where(and(eq(edge.type, 'contains'), inArray(edge.sourceId, frontier)));
    const next: string[] = [];
    for (const r of rows) {
      if (r.t === sourceId) return true;
      if (!seen.has(r.t)) {
        seen.add(r.t);
        next.push(r.t);
      }
    }
    frontier = next;
  }
  return false;
}

/** Insert an edge, returning its id; idempotent on the (source,target,type) unique key. */
async function insertEdge(
  tx: Tx,
  input: { sourceId: string; targetId: string; type: 'parent' | 'cross' | 'contains'; label?: string | null },
): Promise<{ id: string; created: boolean }> {
  const inserted = await tx
    .insert(edge)
    .values(input)
    .onConflictDoNothing()
    .returning({ id: edge.id });
  if (inserted[0]) return { id: inserted[0].id, created: true };
  const existing = await tx
    .select({ id: edge.id })
    .from(edge)
    .where(
      and(eq(edge.sourceId, input.sourceId), eq(edge.targetId, input.targetId), eq(edge.type, input.type)),
    )
    .limit(1);
  return { id: existing[0]!.id, created: false };
}

/** Hard-delete the polymorphic children (annotations + chunks) of a node. */
async function cascadeDeleteNodeChildren(tx: Tx, nodeId: string): Promise<void> {
  const anns = await tx
    .select({ id: annotation.id })
    .from(annotation)
    .where(and(eq(annotation.ownerType, 'node'), eq(annotation.ownerId, nodeId)));
  const annIds = anns.map((a) => a.id);
  if (annIds.length > 0) {
    await tx.delete(chunk).where(and(eq(chunk.ownerType, 'annotation'), inArray(chunk.ownerId, annIds)));
  }
  await tx.delete(chunk).where(and(eq(chunk.ownerType, 'node'), eq(chunk.ownerId, nodeId)));
  await tx.delete(annotation).where(and(eq(annotation.ownerType, 'node'), eq(annotation.ownerId, nodeId)));
}

export type Actions = ReturnType<typeof createActions>;

/** Best-effort, out-of-band embed enqueue. Must never throw or block a mutation. */
export type EnqueueEmbed = (job: EmbedJob) => void;

export interface CreateActionsOptions {
  /**
   * Called after a text-changing mutation commits, to (re)embed the owner's
   * corpus chunks. Fire-and-forget: invoked outside the verb's transaction and
   * wrapped so a failure here never faults the mutation (Phase 2 M2). The API
   * wires this to `pgBoss.send('embed.upsert', job)`; tests can pass a spy or
   * omit it entirely.
   */
  enqueueEmbed?: EnqueueEmbed;
}

/**
 * The action layer: the only write path (invariant #1). Every mutating verb
 * runs in a transaction and writes exactly one event row (invariant #2). Read
 * verbs never write events.
 */
export function createActions(db: Db, opts: CreateActionsOptions = {}) {
  /** Enqueue an embed refresh without ever faulting the originating mutation. */
  const enqueueEmbed = (job: EmbedJob): void => {
    try {
      opts.enqueueEmbed?.(job);
    } catch (err) {
      console.error('embed enqueue failed', err);
    }
  };
  return {
    // --- Graph -------------------------------------------------------------
    async createNode(ctx: ActorContext, input: unknown): Promise<string> {
      const v = createNodeInput.parse(input);
      const id = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(node)
          .values({
            label: v.label,
            tier: v.tier,
            phase: v.phase ?? 'divergent',
            ctx: v.ctx ?? null,
            kind: v.kind ?? 'idea',
            body: v.body ?? null,
          })
          .returning({ id: node.id });
        const rowId = row!.id;
        await writeEvent(tx, ctx, { action: 'createNode', targetType: 'node', targetId: rowId, payload: v });
        return rowId;
      });
      if (v.body && v.body.trim()) enqueueEmbed({ ownerType: 'node', ownerId: id });
      return id;
    },

    async updateNode(ctx: ActorContext, id: string, input: unknown): Promise<void> {
      const v = updateNodeInput.parse(input);
      const patch: Record<string, unknown> = {};
      if (v.label !== undefined) patch.label = v.label;
      if (v.tier !== undefined) patch.tier = v.tier;
      if (v.phase !== undefined) patch.phase = v.phase;
      if (v.ctx !== undefined) patch.ctx = v.ctx;
      if (v.body !== undefined) patch.body = v.body;
      if (Object.keys(patch).length === 0) return;
      await db.transaction(async (tx) => {
        const res = await tx.update(node).set(patch).where(eq(node.id, id)).returning({ id: node.id });
        if (res.length === 0) throw new NotFoundError(`node ${id}`);
        await writeEvent(tx, ctx, { action: 'updateNode', targetType: 'node', targetId: id, payload: patch });
      });
      // Re-embed only when the node's embeddable text (`body`) changed.
      if (patch.body !== undefined) enqueueEmbed({ ownerType: 'node', ownerId: id });
    },

    async setPhase(
      ctx: ActorContext,
      id: string,
      phase: 'divergent' | 'convergent' | 'operational',
    ): Promise<void> {
      await this.updateNode(ctx, id, { phase });
    },

    async archiveNode(ctx: ActorContext, id: string): Promise<void> {
      await db.transaction(async (tx) => {
        const res = await tx
          .update(node)
          .set({ archived: true })
          .where(eq(node.id, id))
          .returning({ id: node.id });
        if (res.length === 0) throw new NotFoundError(`node ${id}`);
        await writeEvent(tx, ctx, { action: 'archiveNode', targetType: 'node', targetId: id });
      });
    },

    /** Hard delete (rare, explicit). Prefer archiveNode. Cascades polymorphic children. */
    async deleteNode(ctx: ActorContext, id: string): Promise<void> {
      await db.transaction(async (tx) => {
        await cascadeDeleteNodeChildren(tx, id);
        const res = await tx.delete(node).where(eq(node.id, id)).returning({ id: node.id });
        if (res.length === 0) throw new NotFoundError(`node ${id}`);
        await writeEvent(tx, ctx, { action: 'deleteNode', targetType: 'node', targetId: id });
      });
    },

    async linkEdge(ctx: ActorContext, input: unknown): Promise<string> {
      const v = linkEdgeInput.parse(input);
      return db.transaction(async (tx) => {
        await assertNodeExists(tx, v.sourceId);
        await assertNodeExists(tx, v.targetId);
        if (v.type === 'contains' && (await wouldCreateContainsCycle(tx, v.sourceId, v.targetId))) {
          throw new CycleError();
        }
        const { id, created } = await insertEdge(tx, v);
        if (created) {
          await writeEvent(tx, ctx, { action: 'linkEdge', targetType: 'edge', targetId: id, payload: v });
        }
        return id;
      });
    },

    async unlinkEdge(ctx: ActorContext, id: string): Promise<void> {
      await db.transaction(async (tx) => {
        const res = await tx.delete(edge).where(eq(edge.id, id)).returning({ id: edge.id });
        if (res.length === 0) throw new NotFoundError(`edge ${id}`);
        await writeEvent(tx, ctx, { action: 'unlinkEdge', targetType: 'edge', targetId: id });
      });
    },

    async createSupernode(ctx: ActorContext, input: unknown): Promise<string> {
      const v = createSupernodeInput.parse(input);
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(node)
          .values({ label: v.label, tier: 'super', kind: 'super', ctx: v.ctx ?? null })
          .returning({ id: node.id });
        const superId = row!.id;
        for (const memberId of v.memberIds) {
          await assertNodeExists(tx, memberId);
          if (await wouldCreateContainsCycle(tx, superId, memberId)) throw new CycleError();
          await insertEdge(tx, { sourceId: superId, targetId: memberId, type: 'contains' });
        }
        await writeEvent(tx, ctx, {
          action: 'createSupernode',
          targetType: 'node',
          targetId: superId,
          payload: v,
        });
        return superId;
      });
    },

    async addToSupernode(ctx: ActorContext, superId: string, memberId: string): Promise<string> {
      return this.linkEdge(ctx, { sourceId: superId, targetId: memberId, type: 'contains' });
    },

    async removeFromSupernode(ctx: ActorContext, superId: string, memberId: string): Promise<void> {
      await db.transaction(async (tx) => {
        const res = await tx
          .delete(edge)
          .where(
            and(
              eq(edge.sourceId, superId),
              eq(edge.targetId, memberId),
              eq(edge.type, 'contains'),
            ),
          )
          .returning({ id: edge.id });
        if (res.length === 0) throw new NotFoundError(`contains edge ${superId}->${memberId}`);
        await writeEvent(tx, ctx, {
          action: 'removeFromSupernode',
          targetType: 'edge',
          targetId: res[0]!.id,
          payload: { superId, memberId },
        });
      });
    },

    // --- Notes & annotations ----------------------------------------------
    async addNote(ctx: ActorContext, input: unknown): Promise<string> {
      const v = addNoteInput.parse(input);
      const id = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(annotation)
          .values({ ownerType: v.ownerType, ownerId: v.ownerId, kind: 'note', body: v.body })
          .returning({ id: annotation.id });
        const rowId = row!.id;
        await writeEvent(tx, ctx, { action: 'addNote', targetType: 'annotation', targetId: rowId, payload: v });
        return rowId;
      });
      enqueueEmbed({ ownerType: 'annotation', ownerId: id });
      return id;
    },

    async updateAnnotation(ctx: ActorContext, id: string, body: string): Promise<void> {
      await db.transaction(async (tx) => {
        const res = await tx
          .update(annotation)
          .set({ body })
          .where(eq(annotation.id, id))
          .returning({ id: annotation.id });
        if (res.length === 0) throw new NotFoundError(`annotation ${id}`);
        await writeEvent(tx, ctx, {
          action: 'updateAnnotation',
          targetType: 'annotation',
          targetId: id,
          payload: { body },
        });
      });
      enqueueEmbed({ ownerType: 'annotation', ownerId: id });
    },

    async deleteAnnotation(ctx: ActorContext, id: string): Promise<void> {
      await db.transaction(async (tx) => {
        await tx.delete(chunk).where(and(eq(chunk.ownerType, 'annotation'), eq(chunk.ownerId, id)));
        const res = await tx.delete(annotation).where(eq(annotation.id, id)).returning({ id: annotation.id });
        if (res.length === 0) throw new NotFoundError(`annotation ${id}`);
        await writeEvent(tx, ctx, { action: 'deleteAnnotation', targetType: 'annotation', targetId: id });
      });
    },

    // --- Reads (no events) -------------------------------------------------
    async getGraph(filter?: unknown) {
      const f: GetGraphFilter = getGraphFilter.parse(filter);
      const conditions = [];
      if (!f?.includeArchived) conditions.push(eq(node.archived, false));
      if (f?.ctx) conditions.push(eq(node.ctx, f.ctx));
      if (f?.phase) conditions.push(eq(node.phase, f.phase));
      if (f?.tier) conditions.push(eq(node.tier, f.tier));
      const nodes = await db
        .select()
        .from(node)
        .where(conditions.length ? and(...conditions) : undefined);
      const ids = new Set(nodes.map((n) => n.id));
      const allEdges = await db.select().from(edge);
      const edges = allEdges.filter((e) => ids.has(e.sourceId) && ids.has(e.targetId));
      return { nodes, edges };
    },

    async getNode(id: string) {
      const rows = await db.select().from(node).where(eq(node.id, id)).limit(1);
      if (rows.length === 0) throw new NotFoundError(`node ${id}`);
      return rows[0]!;
    },

    async listAnnotations(ownerType: 'node' | 'edge' | 'source' | 'output', ownerId: string) {
      return db
        .select()
        .from(annotation)
        .where(and(eq(annotation.ownerType, ownerType), eq(annotation.ownerId, ownerId)));
    },
  };
}
