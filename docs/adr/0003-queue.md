# ADR 0003 — Job queue: pg-boss (Postgres-backed)

**Status:** accepted (Phase 0) · **Date:** 2026-06-22

## Decision

Use **pg-boss** for the background job queue — it stores jobs in the same Neon
Postgres database. No Redis.

## Rationale

The async work (Zotero sync in Phase 1, brainstorm runs in Phase 2) needs a
durable queue and an always-on worker, both on Railway. pg-boss avoids standing
up and paying for a separate Redis service (BullMQ's requirement), which matters
for the ~$5–10/month target (NFR-3). One backing store is simpler to operate and
reason about for a single-user app.

## Consequences

- pg-boss creates its own `pgboss` schema in the database; harmless alongside the
  application schema.
- Phase 0 stands up the worker with a placeholder `noop` queue to verify wiring;
  real queues register against the same pg-boss instance in Phases 1–2.
- If throughput ever outgrows Postgres-backed queuing (not expected at this
  scale), swapping to Redis/BullMQ is localized to the worker.
