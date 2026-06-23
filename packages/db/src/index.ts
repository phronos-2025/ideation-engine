export * as schema from './schema.js';
export {
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
  evalTable,
  event,
  zoteroSync,
} from './schema.js';
export { createDb, type Db, type DbHandle, type CreateDbOptions } from './client.js';

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { node, edge, annotation, event } from './schema.js';

export type Node = InferSelectModel<typeof node>;
export type NewNode = InferInsertModel<typeof node>;
export type Edge = InferSelectModel<typeof edge>;
export type NewEdge = InferInsertModel<typeof edge>;
export type Annotation = InferSelectModel<typeof annotation>;
export type NewAnnotation = InferInsertModel<typeof annotation>;
export type Event = InferSelectModel<typeof event>;
export type NewEvent = InferInsertModel<typeof event>;
