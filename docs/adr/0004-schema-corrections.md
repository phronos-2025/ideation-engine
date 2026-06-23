# ADR 0004 — Corrections to the spec DDL

**Status:** accepted (Phase 0) · **Date:** 2026-06-22

The canonical DDL in `STARTER-ARCHITECTURE.md` §5 is reproduced in
`packages/db/migrations/0000_init.sql` with three corrections. Each is marked
`[FIX]` in that file.

## FIX 1 — `owner_type` enum must include `'annotation'`

The spec defines `owner_type AS ENUM ('node','edge','source','output')` and shares
it between `annotation.owner_type` and `chunk.owner_type`. But invariant #5
("annotations are the embedding corpus") and the brainstorm retrieval in §7.1
("chunks owned by … their annotations") require `chunk` rows owned by an
annotation. The shared enum could not express that. **We add `'annotation'`** to
the enum. The `annotation` table simply never uses that value for its own
`owner_type`; `chunk` does.

## FIX 2 — table order: `sim_run` before `event`

`event.sim_run_id` has a foreign key to `sim_run`, but the spec lists `event`
before `sim_run`. We define `sim_run` first so the FK resolves on a clean apply.

## FIX 3 — `event.actor_id` provenance

The single-user model has no user table, so `event.actor_id` (a nullable uuid) is
**derived from the Cloudflare Access JWT subject** by the action layer
(`actorIdFromIdentity`). Documented here so the column's meaning is explicit; no
shape change.

## Note — schema source of truth

The SQL migration is canonical. `packages/db/src/schema.ts` is a typed Drizzle
mirror kept in sync by hand (indexes/triggers live only in the SQL). We author
the migration directly from the spec DDL rather than generating it, to preserve
the spec's partial indexes, the HNSW vector index, the `set_updated_at` trigger,
and the polymorphic no-FK columns exactly. See ADR 0005.
