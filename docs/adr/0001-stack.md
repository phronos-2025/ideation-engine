# ADR 0001 — Stack and topology

**Status:** accepted (Phase 0) · **Date:** 2026-06-22

## Decision

TypeScript **pnpm monorepo**:

- **`apps/web`** — Astro + a React island (the existing D3 constellation),
  deployed to **Vercel**. PWA for mobile. Talks only to the API, never the DB.
- **`packages/api`** — **Hono** action-layer HTTP service + a **pg-boss** worker,
  deployed to **Railway** (always-on container for async, minutes-long work).
- **`packages/core`** — the action layer: Zod-typed verbs, the single write path,
  one event row per mutation.
- **`packages/db`** — **Neon** (Postgres 16 + pgvector): graph + vectors + event
  log in one store. Canonical SQL schema + a typed Drizzle mirror.

## Rationale

Mirrors the spec's topology (PRD D-9, ARCHITECTURE §9): Vercel for the fast front
end, Railway for the always-on worker Vercel can't host, Neon for scale-to-zero
Postgres whose copy-on-write branches isolate simulations later. One typed action
layer keeps web, mobile, sheets, and the sim agent as four clients of the same
verbs instead of four implementations (invariant #1).

## Consequences

- A shared `core`/`db` spine means the simulation harness (Phase 3) reuses the
  exact verbs the UI uses — a well-tested action layer is most of the sim safety net.
- Local model/inference and local Zotero API remain config-swappable seams (FR-J2).
