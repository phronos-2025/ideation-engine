# Architecture

Clients are peers of one typed action layer; every mutation becomes one event.

```
                         Cloudflare Access (one-identity allowlist)
                                        │  (edge gate — unauth traffic stops here)
                                        ▼
┌───────────────┐   browser    ┌──────────────────┐
│  Phone (PWA)  │─────────────▶│  Vercel           │  Astro shell +
│  Desktop web  │              │  apps/web         │  React/D3 island
└───────────────┘              └─────────┬─────────┘
                                         │  proxy: x-api-token + x-actor-email
                                         ▼
                              ┌──────────────────────┐
                              │  Railway              │
                              │  packages/api (Hono)  │──┐
                              │  pg-boss worker       │  │ same action-layer verbs
                              └───────────┬───────────┘  │
                                          │              │
                                          ▼              ▼
                              ┌────────────────────────────────────┐
                              │  packages/core — the only write path │
                              │  Zod-typed verbs · 1 event / mutation │
                              └───────────────┬──────────────────────┘
                                              ▼
                              ┌──────────────────────────────────────┐
                              │  Neon (Postgres 16 + pgvector)         │
                              │  graph · vectors · append-only event   │
                              └──────────────────────────────────────┘

Phase 2+ external services (server-side keys on Railway only):
  Claude API (generation) · Voyage (embeddings) · Zotero Web API (read-only)
Phase 3: each simulation run executes on its own ephemeral Neon branch.
```

## Data flow (Phase 0)

1. The browser loads the Astro page; the React island fetches `GET /v1/graph`
   (proxied through Vercel to Railway) and renders the D3 constellation.
2. A user action (create node, change phase, add note, make a supernode) calls a
   verb over HTTP → `core` runs it in a transaction and appends one `event` row.
3. Reloading re-fetches from the DB; nothing lives in client memory anymore.

## Provenance chain (built out by Phase 2)

```
node → output → run → run_chunk → chunk → annotation → source
```

Every vetted idea traces back to the primary sources that informed it; the
append-only `event` log records who did what (and, in simulations, which agent).
