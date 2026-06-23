# ADR 0005 — DB driver and migration strategy

**Status:** accepted (Phase 0) · **Date:** 2026-06-22

## Decision

- **Driver:** the API and worker (both on Railway, a persistent Node container)
  use **node-postgres** (`pg`) via Drizzle, with a small pool (`max: 4`) and a
  short `idleTimeoutMillis` (10s).
- **Migrations:** a tiny **forward-only SQL runner** (`packages/db/src/migrate.ts`)
  applies hand-authored `.sql` files from `packages/db/migrations/`, each in its
  own transaction, recorded in a `_migrations` table. DDL runs over the **direct
  (unpooled)** Neon connection.

## Rationale

**Why not the Neon HTTP/serverless driver?** It doesn't support interactive
transactions, but the action layer must write a mutation **and** its event row
atomically (invariant #2), and the `contains` cycle check reads before it writes.
node-postgres gives real transactions. The scale-to-zero concern (R-2 / "don't
hold a pool open") is satisfied by the idle timeout: connections close when idle
so Neon's compute can suspend. Crucially, only Railway touches the DB — the
Vercel/Astro layer always goes through the API — so there is no edge/serverless
call site that would benefit from the HTTP driver.

**Why hand-authored SQL instead of `drizzle-kit generate`?** The spec DDL is the
gold standard and uses features a generator can subtly diverge on: partial
indexes (`WHERE archived = false`), an HNSW vector index with `vector_cosine_ops`,
a `set_updated_at` trigger, and polymorphic columns with no FK. Authoring the
migration straight from the spec keeps it faithful. Drizzle is still the typed
query layer.

## Consequences

- DDL must use the unpooled connection (PgBouncer transaction-mode pooling chokes
  on `CREATE EXTENSION` and similar). The runner prefers `DATABASE_URL_UNPOOLED`.
- New schema changes are added as new numbered `.sql` files; the Drizzle mirror
  in `schema.ts` is updated alongside.
