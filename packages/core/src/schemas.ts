import { z } from 'zod';

export const phaseSchema = z.enum(['divergent', 'convergent', 'operational']);
export const nodeKindSchema = z.enum(['idea', 'super', 'vetted']);
export const edgeTypeSchema = z.enum(['parent', 'cross', 'contains']);
/** What a note/annotation can attach to (the annotation table's owner_type). */
export const annotationOwnerSchema = z.enum(['node', 'edge', 'source', 'output']);

const uuid = z.string().uuid();

export const createNodeInput = z.object({
  label: z.string().min(1),
  tier: z.string().min(1),
  phase: phaseSchema.optional(),
  ctx: z.string().min(1).nullish(),
  kind: nodeKindSchema.optional(),
  body: z.string().nullish(),
});
export type CreateNodeInput = z.infer<typeof createNodeInput>;

export const updateNodeInput = z.object({
  label: z.string().min(1).optional(),
  tier: z.string().min(1).optional(),
  phase: phaseSchema.optional(),
  ctx: z.string().min(1).nullish(),
  body: z.string().nullish(),
});
export type UpdateNodeInput = z.infer<typeof updateNodeInput>;

export const linkEdgeInput = z.object({
  sourceId: uuid,
  targetId: uuid,
  type: edgeTypeSchema,
  label: z.string().nullish(),
});
export type LinkEdgeInput = z.infer<typeof linkEdgeInput>;

export const createSupernodeInput = z.object({
  label: z.string().min(1),
  memberIds: z.array(uuid).default([]),
  ctx: z.string().min(1).nullish(),
});
export type CreateSupernodeInput = z.infer<typeof createSupernodeInput>;

export const addNoteInput = z.object({
  ownerType: annotationOwnerSchema,
  ownerId: uuid,
  body: z.string().min(1),
});
export type AddNoteInput = z.infer<typeof addNoteInput>;

export const enqueueBrainstormInput = z
  .object({
    /** A supernode whose contained members form the scope. */
    scopeId: uuid.optional(),
    /** Or an ad-hoc node selection. One of scopeId / nodeIds is required. */
    nodeIds: z.array(uuid).optional(),
    prompt: z.string().min(1),
    /** Generator model id (e.g. claude-sonnet-4-6 / claude-opus-4-8). */
    model: z.string().min(1),
    params: z.record(z.unknown()).optional(),
  })
  .refine((v) => Boolean(v.scopeId) || (v.nodeIds?.length ?? 0) > 0, {
    message: 'provide scopeId or a non-empty nodeIds',
  });
export type EnqueueBrainstormInput = z.infer<typeof enqueueBrainstormInput>;

export const getGraphFilter = z
  .object({
    ctx: z.string().optional(),
    phase: phaseSchema.optional(),
    tier: z.string().optional(),
    includeArchived: z.boolean().optional(),
  })
  .optional();
export type GetGraphFilter = z.infer<typeof getGraphFilter>;
