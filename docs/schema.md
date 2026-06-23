# Data model

Canonical SQL: [`packages/db/migrations/0000_init.sql`](../packages/db/migrations/0000_init.sql).
Typed mirror: [`packages/db/src/schema.ts`](../packages/db/src/schema.ts). The SQL is
the source of truth (see [ADR 0005](adr/0005-db-driver-and-migrations.md)); the
three corrections to the spec DDL are in [ADR 0004](adr/0004-schema-corrections.md).

## Core graph (Phase 0)

| Table | Purpose |
|---|---|
| `node` | An idea. `tier` (life_track…goal, configurable), `phase` (divergent→convergent→operational), `ctx` tag, `kind` (idea/super/vetted), `body`, `archived` (soft delete). |
| `edge` | Typed relationship. `type` ∈ {`parent`, `cross`, `contains`}. Unique on (source, target, type). `contains` = supernode membership (multi-membership allowed; cycles rejected in the action layer). |
| `annotation` | Polymorphic attached text (`owner_type`/`owner_id`, no FK). Node notes now; Zotero highlights + review comments later. The embedding corpus. |
| `event` | Append-only. One row per mutation: `actor_type`, `actor_id` (from the CF Access JWT), `action` (verb name), target, `payload`, optional `sim_run_id`. |

## Later phases (tables exist now, used later)

| Table | Phase | Purpose |
|---|---|---|
| `source`, `node_source` | 1 | Zotero references (read-only mirror) and their many-to-many links to nodes. |
| `chunk` | 1 | Embeddable text span + `vector(1024)` (Voyage) + `embed_model`. HNSW cosine index. |
| `zotero_sync` | 1 | Incremental `?since=` cursor per library. |
| `run`, `run_chunk` | 2 | A brainstorm execution and the exact chunks that fed it (retrieval provenance). |
| `output` | 2 | Model output through its review lifecycle. `raw_body` is frozen; edits go in `edited_body`. |
| `eval` | 3 | Scores for simulation / human-benchmark comparison. |
| `sim_run` | 3 | Groups the events from one simulated agent session. |

## Supernodes

A supernode is **not a special table** — it is a `node` with `kind='super'`
whose members are the targets of its `contains` edges. The same object is a named
cluster, a unit of joint metadata, and (Phase 2) a saved RAG scope. A node may
have many incoming `contains` edges (multi-membership). `createSupernode` and
`addToSupernode` run a recursive-descent cycle check before inserting.

## Embedding model identity

Every `chunk` records the `embed_model` that produced its vector. Vectors from
different models are not comparable; changing the embedder means re-embedding the
affected rows and matching the `vector(N)` dimension. Phase 0 writes no chunks.

## Invariants enforced here vs. in code

- **DB-enforced:** edge uniqueness, FK cascades on `edge`/`run`/`output`, the
  `eval` check constraint, `updated_at` triggers.
- **Action-layer-enforced:** `contains` acyclicity, polymorphic referential
  integrity (annotation/chunk owners) and cascade-on-archive/delete, append-only
  discipline for `event`, immutability of `output.raw_body`.
