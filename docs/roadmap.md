# Roadmap — Phases 1–3 architecture

> Forward plan, written after the Phase 0 build so the architecture is validated
> end-to-end before the next phases start. Companion ADRs: [0006 model router](adr/0006-model-router.md),
> [0007 review queue](adr/0007-review-queue.md), [0008 simulation isolation](adr/0008-simulation-isolation.md).

## Why the foundation already supports this

Two Phase 0 choices make Phases 1–3 mostly **additive code** rather than
re-architecture:

1. **The whole §5 schema was migrated up front** (not just Phase 0 tables). `run`,
   `run_chunk`, `output`, `eval`, `sim_run`, `chunk`, `source`, `node_source`,
   and `zotero_sync` already exist — later phases add verbs/jobs/UI against them,
   not migrations (one small exception: decision D-4 below).
2. **The action layer is the single write path**, every verb takes an
   `ActorContext` and writes exactly one `event`, and `createDb(connStr) →
   createActions(db)` is fully parameterized. That is precisely what provenance
   (Phase 2) and per-branch simulation isolation (Phase 3) require — the Phase 3
   agent just calls the same verbs with `actorType='agent'` against a branch DB.

## Phase 0 — remaining to close

| Item | Requirement | State |
|---|---|---|
| Deploy behind Cloudflare Access | FR-I1/I2 + §11 acceptance | not deployed (local uses service-token + fallback identity) |
| Context (`ctx`) encode + filter | FR-A2 (P0) | regressed in the design-kit redesign — restore the ctx filter + visual encoding in Graph and Outline |

Everything else in Phase 0 is built and verified (persistence, events, supernodes,
notes, responsive PWA, action layer, docs).

## Phase 1 — References + spreadsheets

**Adds**
- `packages/core` verbs: `syncZotero`, `attachSource`, `getReviewQueue`,
  `confirmProposal` / `rejectProposal` / `editProposalMatch`,
  `exportOperational` / `previewImport` / `commitImport`.
- Worker jobs (pg-boss): `zotero.sync`, `embed.chunk`.
- A **Zotero connector** (read-only, `?since=` cursor, rate-limit handling,
  parent-chain resolution, idempotent upsert by `zotero_key`/`zotero_version`).
- An **embedder** behind the model router (see ADR 0006) → writes `chunk`
  (`vector(1024)`, `embed_model`).
- **Semantic matching** → stages `node_source` + `annotation` proposals
  (`status='proposed'`, `match_score`).
- UI: the **Review** tab and a **Sheet** surface become real.

**Fits the existing seams:** proposals are just rows with `status='proposed'`;
`chunk.owner_type='annotation'` is supported (the §5 correction); the
`zotero_sync` cursor table exists.

**Seams to build here:** the **model router** (ADR 0006), the **`ReviewItem`
union** (ADR 0007), and **binary/multipart passthrough** in the Vercel→Railway
proxy (spreadsheet up/download). Spreadsheet exports stream directly — no object
storage yet (D-2).

## Phase 2 — Brainstorm + synthesis

**Adds**
- Verbs: `enqueueBrainstorm` / `getRun`, `updateOutput` / `approveOutput` /
  `rejectOutput`.
- Worker job `brainstorm.run`: assemble **direct** context (scope's notes, linked
  sources + abstracts, highlights) + **retrieved** context (scope-constrained ANN
  search), call the **generator** via the router (Sonnet default / Opus heavy),
  write an `output` draft; record `run_chunk` provenance.
- UI: the **Brainstorm** tab (scope + prompt + model), draft review folds into the
  Review queue, `approveOutput` publishes a `kind='vetted'` node.

**Fits the existing seams:** `run` / `run_chunk` / `output` exist; scope = a
supernode (same object); full lineage `node → output → run → run_chunk → chunk →
annotation → source` is expressible. Reuses the Phase 1 router.

**Scope-constrained retrieval:** gather owner ids in scope (nodes + their
`node_source` sources + their annotations), filter `chunk` to those owners, then
ANN-order by cosine distance. Fine for a single user's corpus.

## Phase 3 — Simulation + deploy

**Adds**
- Verbs: `startSimRun` / `endSimRun` / `computeMetrics`; a sim harness that drives
  the same action-layer verbs with `actorType='agent'` + `sim_run_id` on a
  **per-run Neon branch** (ADR 0008).
- Neon branching infra (create/drop branch via the Neon API; copy `sim_run`,
  `eval`, and agent `event` rows back to root before drop).
- A **service-token → agent-context** path in `auth.ts` (never the edge gate).
- `eval` scoring against the rubric (OQ-1, still open — D-1).
- Deploy at `phronos.org`.

**Fits the existing seams:** `ActorContext` threading + parameterized
`createActions(db)` are exactly the isolation primitives. Sim generation runs
**inline against the branch**, not via the root queue (D-5).

## Seams to formalize (build as we reach them)

1. **Model router** — `{provider, endpoint, auth, dims, cost, cap}` per model id;
   embedder (P1), generator (P2), local entry (later) with no call-site changes.
   ADR 0006.
2. **`ReviewItem` union** — one shape for all three producers (zotero proposal /
   sheet diff / RAG draft) from day one. ADR 0007.
3. **Proxy binary/multipart** — for spreadsheet import/export (P1).
4. **Agent-context auth path** — service token → `actorType='agent'`, bypassing
   the edge gate (P3). ADR 0008.

## Decisions

| # | Decision | Resolution |
|---|---|---|
| D-1 | Eval rubric (OQ-1) | **OPEN** — pin 2–3 scored dimensions (e.g. specificity, novelty, feasibility) + a judge (model-judge with periodic human spot-check) **before Phase 3** |
| D-2 | Object storage (R2) | **Defer** — stream xlsx exports directly; add R2 only if cached PDFs / large exports appear |
| D-3 | Run-status delivery | **Poll `getRun`** (single user) rather than SSE/websocket |
| D-4 | "Most-uncertain-first" storage | Add a `margin real` column to `node_source` in a Phase 1 migration (it has no jsonb to stash the top1–top2 gap); `annotation` can use its `meta` jsonb |
| D-5 | Sim brainstorms vs the shared queue | Run a sim's generation **inline against the branch**, not via the root pg-boss queue (avoids cross-branch job leakage) |

D-2…D-5 are recommended defaults adopted here and revisitable. D-1 is the one
genuinely unresolved item and gates Phase 3.
