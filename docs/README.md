# Phronos — documentation

Phronos is a single-user knowledge-graph app: ideas are **nodes**, relationships
are **edges**, and ideas mature through phases `divergent → convergent →
operational`. See the source specs in [`../starter-material/`](../starter-material/)
(`PRD-ideation-engine-v1.0.md`, `STARTER-ARCHITECTURE.md`, `INSTRUCTIONS-FOR-CLAUDE.md`).

## How this is documented

- **[`roadmap.md`](roadmap.md)** — the forward plan for Phases 1–3, the seams to
  formalize, and the open decisions (read this before starting a new phase).
- **ADRs** ([`adr/`](adr/)) — one short file per significant decision, with the
  rationale, so future changes don't accidentally reverse them. 0001–0005 cover
  the Phase 0 build; **0006 (model router)**, **0007 (review queue)**, and
  **0008 (simulation isolation)** are the forward-looking Phase 1–3 decisions.
- **[`schema.md`](schema.md)** — the data model, tables, and the three
  corrections applied to the spec DDL.
- **[`api.md`](api.md)** — the action-layer verbs and their HTTP routes.
- **[`architecture.md`](architecture.md)** — the system diagram and data flow.
- **[`runbooks/`](runbooks/)** — operational how-tos (local dev now; one per
  cloud service at deploy time).

## Repository layout

```
packages/db     canonical SQL schema + migrations + Drizzle typed mirror + client
packages/core   the action layer — the only write path; Zod-typed verbs + event log
packages/api    Hono HTTP service + pg-boss worker (Railway)
apps/web        Astro + the React/D3 constellation island + PWA (Vercel)
docs            this folder
```

`db` and `core` are the shared spine. `api` (Railway) and `web` (Vercel) — and,
in Phase 3, the simulation harness — are all clients of the same `core` verbs.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Persistent graph + action layer + edge auth; prototype rewired to the API | in progress |
| 1 | Zotero references, embeddings, unified review queue, spreadsheet I/O | planned |
| 2 | RAG brainstorm, model router, output lifecycle, vetted publishing | planned |
| 3 | Simulation harness on per-run Neon branches; eval scoring; deploy | planned |

## Quick start (local)

See [`runbooks/local-dev.md`](runbooks/local-dev.md). In short:

```bash
pnpm install
docker compose up -d                 # local Postgres 16 + pgvector
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phronos
pnpm db:migrate
pnpm db:seed
pnpm --filter @phronos/api dev        # API on :8080
```
