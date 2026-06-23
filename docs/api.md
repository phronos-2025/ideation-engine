# Action layer & API

The action layer ([`packages/core`](../packages/core/src/actions.ts)) is the only
write path. Each mutating verb runs in a transaction and writes exactly one
`event` row, stamped with the caller's `ActorContext`. Read verbs write no events.
Inputs are validated with Zod ([`schemas.ts`](../packages/core/src/schemas.ts)).

The HTTP service ([`packages/api`](../packages/api/src/app.ts)) maps routes 1:1 to
verbs and holds no business logic. All `/v1/*` routes require the `x-api-token`
service token and set the actor from `x-actor-email` (see [ADR 0002](adr/0002-auth.md)).

## Phase 0 verbs

| Verb | HTTP | Notes |
|---|---|---|
| `createNode(ctx, input)` | `POST /v1/nodes` | → `{ id }`. |
| `updateNode(ctx, id, patch)` | `PATCH /v1/nodes/:id` | partial: label/tier/phase/ctx/body. |
| `setPhase(ctx, id, phase)` | `POST /v1/nodes/:id/phase` | convenience over updateNode. |
| `archiveNode(ctx, id)` | `POST /v1/nodes/:id/archive` | soft delete (preferred). |
| `deleteNode(ctx, id)` | `DELETE /v1/nodes/:id` | hard delete; cascades annotations/chunks. |
| `linkEdge(ctx, input)` | `POST /v1/edges` | `contains` is cycle-checked; idempotent on the unique key. |
| `unlinkEdge(ctx, id)` | `DELETE /v1/edges/:id` | |
| `createSupernode(ctx, input)` | `POST /v1/supernodes` | node `kind='super'` + one `contains` edge per member. |
| `addToSupernode(ctx, superId, memberId)` | `POST /v1/supernodes/:id/members` | = linkEdge contains. |
| `removeFromSupernode(ctx, superId, memberId)` | `DELETE /v1/supernodes/:id/members/:memberId` | |
| `addNote(ctx, input)` | `POST /v1/notes` | annotation `kind='note'`; embeds in Phase 1. |
| `updateAnnotation(ctx, id, body)` | `PATCH /v1/annotations/:id` | |
| `deleteAnnotation(ctx, id)` | `DELETE /v1/annotations/:id` | |
| `getGraph(filter?)` | `GET /v1/graph` | nodes + edges; filter by ctx/phase/tier; archived hidden by default. |
| `getNode(id)` | `GET /v1/nodes/:id` | |
| `listAnnotations(ownerType, ownerId)` | `GET /v1/annotations?ownerType=&ownerId=` | |

Unauthenticated: `GET /healthz`.

## Error shape

Errors return `{ code, message }` with an HTTP status: `validation` (400),
`unauthorized` (401), `not_found` (404), `contains_cycle` (409), `internal` (500).

## Later-phase verbs (not yet implemented)

`syncZotero` (1) · `enqueueBrainstorm`/`getRun` (2) · `getReviewQueue`,
`approveOutput`/`rejectOutput`, `confirmProposal`/`rejectProposal`/`editProposalMatch` (1–2) ·
`exportOperational`/`previewImport`/`commitImport` (1) ·
`startSimRun`/`endSimRun`/`computeMetrics` (3). Each lands in the same `core` package
behind the same event-logging discipline.
