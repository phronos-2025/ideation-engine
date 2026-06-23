/**
 * Typed Drizzle mirror of the canonical schema.
 *
 * The SQL in `migrations/0000_init.sql` is the source of truth for the database
 * shape (extensions, partial indexes, the HNSW vector index, triggers, and the
 * polymorphic no-FK columns). This file mirrors it for typed queries in the
 * action layer. Indexes/triggers are intentionally omitted here — they live in
 * the migration, not in drizzle-kit generation.
 */
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  bigint,
  real,
  jsonb,
  timestamp,
  vector,
  primaryKey,
} from 'drizzle-orm/pg-core';

// --- Enums -----------------------------------------------------------------
export const phaseEnum = pgEnum('phase', ['divergent', 'convergent', 'operational']);
export const edgeTypeEnum = pgEnum('edge_type', ['parent', 'cross', 'contains']);
export const nodeKindEnum = pgEnum('node_kind', ['idea', 'super', 'vetted']);
export const ownerTypeEnum = pgEnum('owner_type', [
  'node',
  'edge',
  'source',
  'output',
  'annotation', // [FIX 1] chunk can be owned by an annotation
]);
export const annotationKindEnum = pgEnum('annotation_kind', [
  'note',
  'highlight',
  'review_comment',
  'derived',
]);
export const reviewStatusEnum = pgEnum('review_status', [
  'proposed',
  'in_review',
  'confirmed',
  'rejected',
]);
export const outputStatusEnum = pgEnum('output_status', [
  'draft',
  'in_review',
  'approved',
  'rejected',
]);
export const actorTypeEnum = pgEnum('actor_type', ['user', 'agent']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

// --- Tables ----------------------------------------------------------------
export const node = pgTable('node', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  tier: text('tier').notNull(),
  phase: phaseEnum('phase').notNull().default('divergent'),
  ctx: text('ctx'),
  kind: nodeKindEnum('kind').notNull().default('idea'),
  body: text('body'),
  archived: boolean('archived').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const edge = pgTable('edge', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => node.id, { onDelete: 'cascade' }),
  targetId: uuid('target_id')
    .notNull()
    .references(() => node.id, { onDelete: 'cascade' }),
  type: edgeTypeEnum('type').notNull(),
  label: text('label'),
  createdAt: createdAt(),
});

export const source = pgTable('source', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoteroKey: text('zotero_key').unique(),
  zoteroVersion: bigint('zotero_version', { mode: 'number' }),
  itemType: text('item_type'),
  title: text('title'),
  creators: jsonb('creators'),
  year: integer('year'),
  doi: text('doi'),
  abstract: text('abstract'),
  tags: text('tags').array(),
  raw: jsonb('raw'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const nodeSource = pgTable(
  'node_source',
  {
    nodeId: uuid('node_id')
      .notNull()
      .references(() => node.id, { onDelete: 'cascade' }),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    role: text('role'),
    status: reviewStatusEnum('status').notNull().default('confirmed'),
    matchScore: real('match_score'),
  },
  (t) => [primaryKey({ columns: [t.nodeId, t.sourceId] })],
);

export const annotation = pgTable('annotation', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerType: ownerTypeEnum('owner_type').notNull(),
  ownerId: uuid('owner_id').notNull(),
  sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
  zoteroKey: text('zotero_key'),
  zoteroParentKey: text('zotero_parent_key'),
  kind: annotationKindEnum('kind').notNull(),
  body: text('body').notNull(),
  meta: jsonb('meta'),
  status: reviewStatusEnum('status').notNull().default('confirmed'),
  matchScore: real('match_score'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const chunk = pgTable('chunk', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerType: ownerTypeEnum('owner_type').notNull(),
  ownerId: uuid('owner_id').notNull(),
  text: text('text').notNull(),
  embedding: vector('embedding', { dimensions: 1024 }),
  embedModel: text('embed_model').notNull(),
  createdAt: createdAt(),
});

export const simRun = pgTable('sim_run', {
  id: uuid('id').primaryKey().defaultRandom(),
  scenario: text('scenario').notNull(),
  agentModel: text('agent_model').notNull(),
  config: jsonb('config'),
  status: text('status').notNull().default('running'),
  metrics: jsonb('metrics'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

export const run = pgTable('run', {
  id: uuid('id').primaryKey().defaultRandom(),
  scopeId: uuid('scope_id').references(() => node.id, { onDelete: 'set null' }),
  scopeSnapshot: jsonb('scope_snapshot'),
  model: text('model').notNull(),
  embedModel: text('embed_model').notNull(),
  prompt: text('prompt').notNull(),
  params: jsonb('params'),
  status: text('status').notNull().default('queued'),
  error: text('error'),
  createdBy: uuid('created_by'),
  actorType: actorTypeEnum('actor_type').notNull().default('user'),
  simRunId: uuid('sim_run_id').references(() => simRun.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const runChunk = pgTable(
  'run_chunk',
  {
    runId: uuid('run_id')
      .notNull()
      .references(() => run.id, { onDelete: 'cascade' }),
    chunkId: uuid('chunk_id')
      .notNull()
      .references(() => chunk.id, { onDelete: 'cascade' }),
    score: real('score'),
    rank: integer('rank'),
  },
  (t) => [primaryKey({ columns: [t.runId, t.chunkId] })],
);

export const output = pgTable('output', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id')
    .notNull()
    .references(() => run.id, { onDelete: 'cascade' }),
  rawBody: text('raw_body').notNull(),
  editedBody: text('edited_body'),
  status: outputStatusEnum('status').notNull().default('draft'),
  publishMode: text('publish_mode'),
  targetNodeId: uuid('target_node_id').references(() => node.id, { onDelete: 'set null' }),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: createdAt(),
});

export const evalTable = pgTable('eval', {
  id: uuid('id').primaryKey().defaultRandom(),
  outputId: uuid('output_id').references(() => output.id, { onDelete: 'cascade' }),
  nodeId: uuid('node_id').references(() => node.id, { onDelete: 'cascade' }),
  scorer: text('scorer').notNull(),
  rubric: text('rubric'),
  score: real('score'),
  notes: text('notes'),
  createdAt: createdAt(),
});

export const event = pgTable('event', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorType: actorTypeEnum('actor_type').notNull(),
  actorId: uuid('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: uuid('target_id'),
  payload: jsonb('payload'),
  simRunId: uuid('sim_run_id').references(() => simRun.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id'),
  createdAt: createdAt(),
});

export const zoteroSync = pgTable('zotero_sync', {
  libraryId: text('library_id').primaryKey(),
  lastVersion: bigint('last_version', { mode: 'number' }).notNull().default(0),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
});

export const schema = {
  node,
  edge,
  source,
  nodeSource,
  annotation,
  chunk,
  simRun,
  run,
  runChunk,
  output,
  eval: evalTable,
  event,
  zoteroSync,
};
