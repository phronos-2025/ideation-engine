# CLAUDE.md — Phronos

Standing context for the coding agent. Read `ARCHITECTURE.md` for the full spec;
this file is the short version plus the rules you must not break.

## What you're building

A single-user knowledge-graph app. Ideas are nodes; relationships are edges;
ideas move through phases `divergent → convergent → operational`. Sources come
from Zotero (read-only), an LLM brainstorm produces research scoped to part of
the graph, a human vets it before it joins the graph, operational ideas
round-trip to spreadsheets, and an LLM agent can drive the whole thing to run
simulations. The UI already exists as `phase_constellation.jsx` (a D3 force
graph) and currently uses seeded in-memory data; Phase 0 is wiring it to a real
API.

## Invariants — do not violate

1. The **action layer is the only write path**. UI, mobile, sheets, and the sim
   agent are all clients of the same typed verbs (see `ARCHITECTURE.md` §6). No
   client touches the database directly.
2. **Every mutating verb emits one `event` row.** `event` is append-only.
3. **One review queue, three producers** (Zotero ETL, RAG synthesis, sheet
   import). Everything enters as a `proposed`/`draft` row and needs a human
   commit. Don't build separate review surfaces.
4. A **supernode is a node** (`kind='super'`); membership is `contains` edges;
   multi-membership is allowed; `contains` cycles are rejected at write time.
   Selection = supernode = RAG scope — the same object.
5. **Annotations are the embedding corpus.** Node notes, Zotero highlights, and
   review comments are all `annotation` rows; the same text gets chunked/embedded.
6. **Zotero is read-only.** Never write to the Zotero API. All derived knowledge
   stays on the Phronos side.
7. **Vectors carry `embed_model`.** Don't mix embedders in one search; re-embed
   when the embedder changes.
8. **Credentials are server-side only.** Never send API keys to a client or put
   them in URLs. (Server-side = Railway env vars.)
9. **Soft delete** (`archiveNode`) by default so provenance/events survive.
10. **`output.raw_body` is immutable** after creation; edits go in `edited_body`.
11. **One identity, allowlisted.** Single-user app: no signup, no password store,
    no user table. Federate to Google/GitHub and allow exactly one identity.
12. **Agents are not accounts.** Sim agents never use the login path; they run
    server-side with a service token, tagged `actor_type='agent'`, isolated on
    their own Neon branch — never the production branch.

## Stack guidance

- **Database: Neon** (serverless PostgreSQL 16+ with `pgvector`) — graph +
  vectors + event log in one store, no separate graph DB. Scales to zero when
  idle. Use Neon's serverless/HTTP driver (don't hold a pool open, or you defeat
  scale-to-zero). Schema is canonical in `ARCHITECTURE.md` §5 — generate
  migrations from it. `chunk.embedding` is `vector(1024)` (Voyage dimension).
- **Hosting:** Vercel for the Astro front end + thin API routes; **Railway** for
  the action-layer API, the background worker, and the job queue (the long async
  work — brainstorm runs, Zotero sync — needs an always-on worker Vercel can't
  give). Cloudflare R2 for any file storage. Not Supabase.
- **Models:** Claude API for generation (Sonnet default, Opus for heavy
  synthesis); **Voyage AI** (`voyage-4`, 1024-dim) for embeddings — Anthropic has
  no embeddings endpoint, so it's a separate key. Hugging Face is out of scope
  until the local-later phase. Keep both roles behind a router.
- **Auth: Cloudflare Access** in front of `phronos.org` with a one-identity
  allowlist (or Auth.js in-app). No password store. Set this up at first deploy.
- Local Zotero API, local inference, and local embedder are later seams — keep
  base URLs and auth in config so they drop in without refactors.
- UI: keep the existing React/D3 prototype; ship responsive/PWA for mobile
  (read-only graph + outline editor + enqueue form). No separate mobile backend.

## Build order (acceptance criteria in `ARCHITECTURE.md` §11)

- **Phase 0** — Neon + graph/notes verbs; rewire the prototype to the API;
  responsive; put it behind Cloudflare Access from the first deploy. Persistence
  + events working end to end.
- **Phase 1** — Zotero connector (`?since=` cursor, rate-limit handling, parent
  chain), embedding pipeline, semantic matching, unified review queue; operational
  spreadsheet export + one-way previewed import.
- **Phase 2** — RAG (direct + scope-constrained retrieval), model router, async
  runs, output lifecycle, `approveOutput` publishing with full lineage.
- **Phase 3** — simulation harness (service-token agents on per-run Neon
  branches; metrics copied to root before drop), event-log analytics, `eval`
  scoring, deploy.

## Conventions

- All mutations go through action-layer verbs; call them from every client.
- Polymorphic owners (`annotation`, `chunk`) have no DB FK — the action layer
  enforces referential integrity and cascade-on-archive.
- Write tests at the action-layer boundary; the sim harness exercises the same
  verbs, so a well-tested action layer is most of the simulation safety net.
- Honor Zotero rate limits (`Backoff`, `429` + `Retry-After`, ≤4 concurrent).
- Don't force weak semantic matches; "no match / create new / skip" is always an
  allowed outcome.

## Unresolved (don't guess — flag it)

The simulation **EVAL rubric** ("quality of ideas reaching `operational`") is not
yet defined. Build the harness and scoring tables, but leave the rubric
dimensions as configuration and surface the gap; don't invent a scoring scheme.
