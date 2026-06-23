# Phronos — Architecture Specification

> Implementation source of truth. This document is written to be handed to an
> AI coding agent (Claude Code) and to human contributors. It specifies the
> data model, the action-layer contract, the workflows, and the deployment
> topology. Where a decision has a non-obvious rationale, the rationale is
> stated inline so the implementer doesn't re-derive (or accidentally reverse)
> it. Open questions are collected in the final section; everything else is
> decided.

---

## 1. What this system is

Phronos is a single-user (initially) knowledge-graph application for capturing,
connecting, researching, and operationalizing ideas. Ideas are **nodes** in a
graph; relationships are **edges**. Ideas move through three **phases**
(`divergent → convergent → operational`). Primary sources live in Zotero and are
mirrored in; an LLM-driven "brainstorm" produces research scoped to a selected
part of the graph; a human reviews and vets that research before it becomes part
of the graph; operational ideas round-trip to spreadsheets; and the whole system
can be driven by an LLM agent to run simulations.

The starting UI already exists as a force-directed D3 graph (`phase_constellation.jsx`).
That prototype currently holds its data in a seeded in-memory array. The first
implementation job is to make it read and write through the API defined here.

---

## 2. Load-bearing decisions (do not violate these)

These are the invariants the whole design rests on. Breaking any one of them
quietly re-introduces a problem the design was built to avoid.

1. **API-first. The action layer is the only write path.** The web UI, the
   mobile PWA, the spreadsheet sync, and the simulation agent are four *clients*
   of one typed API. No client mutates the database directly. This is what makes
   mobile editing, sheet import, and "LLM as the user" the same code instead of
   four reimplementations.

2. **Every mutation emits an event.** The `event` table is append-only and
   records who did what. It serves two readers at once: provenance (how a vetted
   idea came to exist) and simulation analytics (what an agent did across a run).
   One log, two readers. Reads never write events.

3. **One proposal/review pattern, three producers.** Zotero ingestion, RAG
   synthesis, and spreadsheet import all produce *proposals* that carry a
   confidence score and a provenance pointer, enter a shared review queue, and
   require a human (or, in simulation, the agent standing in for one) to commit.
   Nothing reaches the graph as "vetted" without passing through this gate. Do
   not build three review surfaces.

4. **A supernode is a node, not a special table.** Membership is expressed as
   `contains` edges. A node may belong to *many* supernodes (multi-membership is
   required). The same object is simultaneously: a named cluster, a unit of joint
   metadata, and a saved RAG scope. Selection = supernode = RAG scope.

5. **Annotations are the embedding corpus.** Node notes, Zotero highlights, and
   review comments are all rows in `annotation`. The same text that a human reads
   is the text that gets chunked and embedded for retrieval. Reference manager
   and RAG corpus are one dataset viewed two ways.

6. **Zotero is read-only upstream.** All derived knowledge lives on the Phronos
   side. The connector never writes back to Zotero. (Annotation *write* support
   in the Zotero Web API is still an open feature request; read support is solid.
   We rely only on reads.)

7. **Embeddings carry their model identity.** Vectors from two different
   embedding models are not comparable. Every `chunk` records the `embed_model`
   that produced it. Changing the embedder means re-embedding the affected rows;
   the column is how you find the stale ones.

8. **Credentials never touch a client.** API keys (Zotero, LLM providers) live
   server-side only. They are never sent to the browser or the phone, never put
   in URLs or query strings.

9. **One identity, allowlisted — no user accounts to manage.** This is a
   single-user app. There is no signup, no password store, and no multi-tenant
   user table. Access is granted by federating to one external identity (Google
   or GitHub) and allowlisting exactly that identity. The federated account, with
   MFA or a passkey, is the real security perimeter (see section 10).

10. **Agents are not accounts.** Simulation agents never use the login path. They
    run server-side, authenticate to the action layer with a service credential
    (never a human session), and are tagged `actor_type='agent'` with a
    `sim_run_id`. Their writes are isolated from the real graph at the
    infrastructure layer, not by a query filter (see section 7.5).

---

## 3. System tiers

```
Clients (peers of one API)
  Web UI (D3 graph canvas) · Mobile PWA (outline + queue) · Sheets sync · Sim harness
        |
Action layer  — typed API; every mutation is a logged event
        |
Services
  Graph service · RAG service · Reference service · Review service
        |
Backing systems
  Postgres + pgvector (graph, vectors, event log) · Object store (PDFs, exports)
  · Zotero (read-only source) · Inference (cloud now; local-capable later)
```

The clients differ only in their UI affordances; they all call the same verbs in
section 6.

---

## 4. Domain model (conceptual)

- **Node** — an idea. Has a `tier` (life_track | realm | network | initiative |
  goal — these mirror the existing constellation UI and are configurable), a
  `phase` (divergent | convergent | operational), an optional `ctx` context tag
  (e.g. stanford, phronos, syndromic, personal), and a `kind` (idea | super |
  vetted).
- **Edge** — a typed relationship. `type` is one of:
  - `parent` — the hierarchy tree (a node has at most one parent edge into it,
    by convention, though the schema does not hard-enforce single-parent;
    enforce in the action layer if desired).
  - `cross` — a lateral association between ideas anywhere in the graph.
  - `contains` — supernode membership. Many incoming `contains` edges per node
    are allowed (multi-membership). Cycles are forbidden and checked at write time.
- **Supernode** — a node with `kind = 'super'` whose members are the targets of
  its `contains` edges. Holds the joint metadata for the cluster as its own
  fields/notes. Doubles as a saved RAG scope.
- **Phase** — the maturation state machine. `operational` is the only phase that
  participates in spreadsheet export/import. Exploratory (`divergent`) ideas are
  fed by RAG; they do not leak into the structured planning surface until
  promoted.
- **Source** — a bibliographic item mirrored from Zotero (read-only upstream).
- **Annotation** — polymorphic attached text (node note, Zotero highlight/note,
  review comment, or other derived knowledge).
- **Chunk** — one embeddable span of text plus its vector. The retrieval corpus.
- **Run** — one brainstorm execution against a scope.
- **Output** — the knowledge-object produced by a run, through its review
  lifecycle (`draft → in_review → approved/rejected`), holding both the model's
  frozen `raw_body` and the human's `edited_body`.
- **Event** — append-only record of every mutation and every simulated action.
- **Sim run** — a grouping of events produced by one simulated agent session.

---

## 5. Database schema (PostgreSQL 16+ with the `pgvector` extension)

The DDL below is the canonical schema. It is commented for intent, not just
shape. Generate migrations from it; do not hand-edit a divergent copy elsewhere.

```sql
-- Extensions -----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector

-- Enumerated types -----------------------------------------------------------
CREATE TYPE phase           AS ENUM ('divergent', 'convergent', 'operational');
CREATE TYPE edge_type       AS ENUM ('parent', 'cross', 'contains');
CREATE TYPE node_kind       AS ENUM ('idea', 'super', 'vetted');
-- owner_type is shared by annotation and chunk: it says what a row is attached to.
CREATE TYPE owner_type      AS ENUM ('node', 'edge', 'source', 'output');
CREATE TYPE annotation_kind AS ENUM ('note', 'highlight', 'review_comment', 'derived');
CREATE TYPE review_status   AS ENUM ('proposed', 'in_review', 'confirmed', 'rejected');
CREATE TYPE output_status   AS ENUM ('draft', 'in_review', 'approved', 'rejected');
CREATE TYPE actor_type      AS ENUM ('user', 'agent');

-- NODE -----------------------------------------------------------------------
CREATE TABLE node (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  tier        text NOT NULL,                 -- life_track|realm|network|initiative|goal (configurable)
  phase       phase NOT NULL DEFAULT 'divergent',
  ctx         text,                          -- context tag; nullable
  kind        node_kind NOT NULL DEFAULT 'idea',
  body        text,                          -- canonical text shown on the graph.
                                             -- For kind='vetted', copied from output.edited_body at publish.
  archived    boolean NOT NULL DEFAULT false,-- prefer archiving over hard delete to preserve provenance/events
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX node_phase_idx ON node (phase) WHERE archived = false;  -- operational export filter
CREATE INDEX node_kind_idx  ON node (kind);
CREATE INDEX node_ctx_idx   ON node (ctx);

-- EDGE -----------------------------------------------------------------------
CREATE TABLE edge (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   uuid NOT NULL REFERENCES node(id) ON DELETE CASCADE,
  target_id   uuid NOT NULL REFERENCES node(id) ON DELETE CASCADE,
  type        edge_type NOT NULL,
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- prevent duplicate identical edges between the same pair
  UNIQUE (source_id, target_id, type)
);
CREATE INDEX edge_source_idx ON edge (source_id);
CREATE INDEX edge_target_idx ON edge (target_id);
-- NOTE: 'contains' expresses supernode membership; multiple incoming 'contains'
-- edges per node are intentional (multi-membership). Cycle prevention for
-- 'contains' is enforced in the action layer (recursive descent before insert),
-- NOT by a DB constraint.

-- SOURCE (Zotero mirror; read-only upstream) ---------------------------------
CREATE TABLE source (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zotero_key     text UNIQUE,                -- stable upsert key from the Zotero API
  zotero_version bigint,                     -- item version, for change detection
  item_type      text,                       -- journalArticle, book, ...
  title          text,
  creators       jsonb,                      -- [{creatorType, firstName, lastName}|{name}]
  year           int,
  doi            text,
  abstract       text,                       -- embedded as a chunk (semantic retrieval)
  tags           text[],                     -- structured RAG filters (year/tags/creators)
  raw            jsonb,                       -- full Zotero `data` blob for unmodeled fields
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX source_tags_idx ON source USING gin (tags);

-- NODE_SOURCE (M2M: which references support which nodes) ---------------------
CREATE TABLE node_source (
  node_id     uuid NOT NULL REFERENCES node(id)   ON DELETE CASCADE,
  source_id   uuid NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  role        text,                              -- supports|contradicts|background|...
  status      review_status NOT NULL DEFAULT 'confirmed', -- ETL proposals enter as 'proposed'
  match_score real,                              -- semantic confidence at proposal time
  PRIMARY KEY (node_id, source_id)
);
CREATE INDEX node_source_source_idx ON node_source (source_id);
CREATE INDEX node_source_status_idx ON node_source (status);  -- review queue

-- ANNOTATION (polymorphic attached text) -------------------------------------
CREATE TABLE annotation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type        owner_type NOT NULL,         -- node | edge | source | output
  owner_id          uuid NOT NULL,
  source_id         uuid REFERENCES source(id) ON DELETE SET NULL,
                                                 -- set when derived from a specific source
                                                 -- (Zotero highlights / child notes); null for free notes
  zotero_key        text,                        -- stable key for Zotero-origin annotations (idempotent upsert)
  zotero_parent_key text,                        -- records the 2-hop parent (attachment/reference)
  kind              annotation_kind NOT NULL,    -- note | highlight | review_comment | derived
  body              text NOT NULL,
  meta              jsonb,                        -- page label, color, annotationType, etc.
  status            review_status NOT NULL DEFAULT 'confirmed', -- ETL-proposed annotations enter 'proposed'
  match_score       real,                         -- semantic confidence for proposed node attachment
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX annotation_owner_idx ON annotation (owner_type, owner_id);
CREATE UNIQUE INDEX annotation_zotero_key_idx ON annotation (zotero_key) WHERE zotero_key IS NOT NULL;
-- owner_type/owner_id is a polymorphic reference (no FK). The action layer is
-- responsible for referential integrity; cascade deletes are handled there.

-- CHUNK (embedding corpus) ---------------------------------------------------
CREATE TABLE chunk (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type  owner_type NOT NULL,             -- node | source | annotation | output (origin of the text)
  owner_id    uuid NOT NULL,
  text        text NOT NULL,
  embedding   vector(1024),                    -- dimension MUST match embed_model's output.
                                               -- 1024 = Voyage voyage-4 family (the chosen embedder).
                                               -- If you switch embedders, change this to the new
                                               -- model's dimension and re-embed (see embed_model below).
  embed_model text NOT NULL,                   -- which embedder produced this vector, e.g. 'voyage-4'
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chunk_owner_idx ON chunk (owner_type, owner_id);
-- Cosine ANN index. Build after a representative amount of data exists.
-- HNSW recommended for recall/latency; ivfflat is the lighter alternative.
CREATE INDEX chunk_embedding_idx ON chunk USING hnsw (embedding vector_cosine_ops);
-- NOTE: if you swap embedders, rows with the old embed_model are stale and must
-- be re-embedded. Do not mix models in one ANN search.

-- RUN (a brainstorm execution) -----------------------------------------------
CREATE TABLE run (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id       uuid REFERENCES node(id) ON DELETE SET NULL,  -- supernode used as scope (if any)
  scope_snapshot jsonb,                         -- frozen node/edge ids in scope at run time
                                                -- (selections change; the run must remember what it saw)
  model          text NOT NULL,                 -- generation model id (router key)
  embed_model    text NOT NULL,                 -- embedder used for retrieval in this run
  prompt         text NOT NULL,
  params         jsonb,                         -- temperature, top_k, etc.
  status         text NOT NULL DEFAULT 'queued',-- queued | running | done | failed
  error          text,
  created_by     uuid,
  actor_type     actor_type NOT NULL DEFAULT 'user',
  sim_run_id     uuid,                          -- set when the run was issued inside a simulation
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);
CREATE INDEX run_status_idx  ON run (status);
CREATE INDEX run_sim_idx     ON run (sim_run_id);

-- RUN_CHUNK (retrieval provenance: exactly which chunks fed a run) ------------
CREATE TABLE run_chunk (
  run_id    uuid NOT NULL REFERENCES run(id)   ON DELETE CASCADE,
  chunk_id  uuid NOT NULL REFERENCES chunk(id) ON DELETE CASCADE,
  score     real,                               -- similarity at retrieval time
  rank      int,
  PRIMARY KEY (run_id, chunk_id)
);

-- OUTPUT (the knowledge-object lifecycle) ------------------------------------
CREATE TABLE output (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         uuid NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  raw_body       text NOT NULL,                 -- exactly what the model emitted; FROZEN, never edited
  edited_body    text,                          -- human working copy during review
  status         output_status NOT NULL DEFAULT 'draft',
  publish_mode   text,                          -- 'create' | 'attach' (decided at approval)
  target_node_id uuid REFERENCES node(id) ON DELETE SET NULL, -- the node it became / attached to
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX output_status_idx ON output (status);  -- review queue
-- raw_body vs edited_body is deliberate: "vetted" means you can always compare
-- what the model said against what a human approved. Never overwrite raw_body.

-- EVAL (scores for simulation / human-benchmark comparison) ------------------
CREATE TABLE eval (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id   uuid REFERENCES output(id) ON DELETE CASCADE,
  node_id     uuid REFERENCES node(id)   ON DELETE CASCADE, -- optional: score a published node
  scorer      text NOT NULL,                    -- 'human' | <model id> | <rubric id>
  rubric      text,                             -- which rubric/dimension was scored
  score       real,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (output_id IS NOT NULL OR node_id IS NOT NULL)
);

-- EVENT (append-only spine: provenance + simulation analytics) ---------------
CREATE TABLE event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  actor_type NOT NULL,              -- user | agent
  actor_id    uuid,
  action      text NOT NULL,                    -- action-layer verb name (see section 6)
  target_type text,                             -- node | edge | output | ...
  target_id   uuid,
  payload     jsonb,                            -- full action args / diff
  sim_run_id  uuid REFERENCES sim_run(id) ON DELETE SET NULL, -- set inside a simulation
  session_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_sim_idx     ON event (sim_run_id);
CREATE INDEX event_action_idx  ON event (action);
CREATE INDEX event_created_idx ON event (created_at);
-- This table is append-only. No UPDATE, no DELETE in normal operation.

-- SIM_RUN (groups events from one simulated agent session) -------------------
CREATE TABLE sim_run (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario    text NOT NULL,                    -- scenario/config name
  agent_model text NOT NULL,                    -- model driving the agent-as-user
  config      jsonb,
  status      text NOT NULL DEFAULT 'running',  -- running | done | failed
  metrics     jsonb,                            -- computed outcome metrics (see section 7.5)
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);

-- ZOTERO_SYNC (incremental sync cursor) --------------------------------------
CREATE TABLE zotero_sync (
  library_id     text PRIMARY KEY,              -- user/group library id
  last_version   bigint NOT NULL DEFAULT 0,     -- Last-Modified-Version cursor for ?since=
  last_synced_at timestamptz
);
```

`updated_at` columns should be maintained by a trigger or by the action layer on
every write. A standard `set_updated_at()` trigger on `node`, `source`, and
`annotation` is sufficient.

### 5.1 Notes on the model

- **Multi-supernode membership** needs no extra structure: a node simply has
  several incoming `contains` edges. The thing to guard is cycles — see the
  `linkEdge` contract in section 6.
- **Polymorphic owners** (`annotation`, `chunk`) trade DB-enforced FKs for
  flexibility. The action layer owns referential integrity for these, including
  cascading deletes when an owner is archived/removed.
- **Soft delete by default.** `node.archived` exists so that removing an idea
  does not destroy the event/provenance trail. Hard deletes are reserved for
  genuine data-entry mistakes and should be rare and explicit.

---

## 6. Action layer contract

The action layer is the single write path. Signatures below are TypeScript-ish
for clarity; implement in whatever the chosen stack uses. **Every mutating verb
writes one `event` row** with `actor_type`/`actor_id`/`sim_run_id` taken from the
caller's context, so the simulation harness records itself for free by calling
the same verbs with `actor_type='agent'`. Read verbs do not write events.

```ts
// --- Graph -----------------------------------------------------------------
createNode(input: { label; tier; phase?; ctx?; kind?; body? }): NodeId
updateNode(id, patch: Partial<{ label; tier; phase; ctx; body }>): void
setPhase(id, phase): void                         // convenience over updateNode
archiveNode(id): void                             // soft delete (preferred)
deleteNode(id): void                              // hard delete (rare, explicit)

linkEdge(sourceId, targetId, type, label?): EdgeId
  // For type='contains', MUST reject if it would create a cycle in the
  // containment graph (recursive descent from targetId looking for sourceId).
unlinkEdge(id): void

createSupernode(label, memberIds: NodeId[], ctx?): NodeId
  // creates a node with kind='super' and one 'contains' edge per member.
addToSupernode(superId, memberId): void           // = linkEdge(superId, memberId, 'contains')
removeFromSupernode(superId, memberId): void

// --- Notes & annotations ---------------------------------------------------
addNote(ownerType, ownerId, body): AnnotationId   // kind='note'; enqueues embedding
updateAnnotation(id, body): void                  // re-embeds the affected chunk(s)
deleteAnnotation(id): void
attachSource(nodeId, sourceId, role?): void        // upsert node_source (status='confirmed')

// --- Reference / Zotero (read-only upstream) -------------------------------
syncZotero(libraryId): IngestBatch
  // pulls changed items/notes/annotations since zotero_sync.last_version,
  // upserts source/annotation, embeds new text, runs semantic matching,
  // and stages proposals (node_source + annotation rows with status='proposed').
  // Honors Backoff / 429 / <=4 concurrent. Updates the cursor on success.

// --- Brainstorm (RAG) ------------------------------------------------------
enqueueBrainstorm(input: {
  scopeId?: NodeId;          // a supernode, OR
  nodeIds?: NodeId[];        // an ad-hoc selection
  prompt: string;
  model: string;             // router key for a general model
  params?: object;
}): RunId                                          // async; status tracked on `run`
getRun(id): Run                                    // read

// --- Review (unified queue: proposals + draft outputs) ---------------------
getReviewQueue(filter?: { producer?; status?; sortByUncertainty? }): ReviewItem[]
  // Sort options must include "most uncertain first", computed as either
  // low top score (orphan candidate) or small top1-top2 margin (ambiguous).

// Outputs (synthesis):
updateOutput(id, editedBody): void
approveOutput(id, opts: {
  mode: 'create' | 'attach';
  targetNodeId?: NodeId;     // required when mode='attach'
  phase?: phase;             // for mode='create'
}): NodeId
  // On 'create': mint a node (kind='vetted'), copy edited_body to node.body,
  //   set output.target_node_id, link the new node to its scope members,
  //   emit event. On 'attach': set target, add edited_body as a 'derived'
  //   annotation on the target node.
rejectOutput(id): void

// Proposals (Zotero ETL / sheet import):
confirmProposal(kind: 'node_source' | 'annotation', id): void   // status -> 'confirmed'
rejectProposal(kind, id): void                                  // status -> 'rejected'
editProposalMatch(kind, id, newNodeId): void                    // re-point, then confirm

// --- Spreadsheets (operational phase only; one-way import with preview) -----
exportOperational(): FileRef                       // xlsx/csv of phase='operational' nodes
previewImport(file): ImportDiff                    // computes per-row create/update/no-op
commitImport(diff): void                           // applies confirmed rows via the verbs above

// --- Simulation ------------------------------------------------------------
startSimRun(scenario, agentModel, config?): SimRunId
  // The agent then drives the graph by calling the SAME verbs above with its
  // session context (actor_type='agent', sim_run_id set).
endSimRun(id): void
computeMetrics(simRunId): Metrics                  // see section 7.5
```

---

## 7. Workflows

### 7.1 Brainstorm — RAG context assembly

Context is assembled from two sources, both constrained by the selected scope:

1. **Direct context** (no similarity search): for every node in scope, pull its
   own notes (`annotation` where `owner_type='node'`), its linked sources
   (`node_source → source`) including their abstracts and metadata, and the
   highlights on those sources. This text goes into the prompt verbatim because
   the user explicitly selected it.
2. **Retrieved context** (vector search): embed the prompt with the run's
   `embed_model`; ANN-search `chunk` *restricted to chunks owned by in-scope
   nodes/sources/their annotations*; take top-k. Record each retrieved chunk in
   `run_chunk` with score and rank.

Assemble `direct + retrieved` into the final prompt, call the general model, and
write the result as an `output` row with `status='draft'`. The run is async; the
phone enqueues and the worker executes, because local-or-cloud generation can
take long enough that no client should block on it.

Pseudocode:

```
run = create run(scope, prompt, model, embed_model, status='queued')
worker:
  direct   = gather_direct_context(scope)           # FK walk, no embeddings
  qvec     = embed(prompt, run.embed_model)
  scopeIds = chunk ids owned by scope's nodes/sources/annotations
  hits     = ann_search(qvec, within=scopeIds, k=params.top_k)
  record run_chunk(run, hits)
  ctx      = assemble(direct, hits.texts)
  text     = generate(run.model, ctx + prompt)
  create output(run, raw_body=text, status='draft')
  run.status = 'done'
```

### 7.2 Synthesis — review and publish

A draft `output` enters the review queue. The human edits `edited_body` and may
attach `review_comment` annotations to the output. On `approveOutput`:

- `mode='create'` → new node (`kind='vetted'`), `node.body = edited_body`, link
  the node to its scope members (e.g. `cross` edges), set `target_node_id`.
- `mode='attach'` → set `target_node_id` to an existing node and add
  `edited_body` as a `kind='derived'` annotation on it.

Either path emits an event. The full lineage is then traceable:
`node → output → run → run_chunk → chunk → annotation → source`.

### 7.3 Zotero ingestion ETL (read-only)

Trigger: `syncZotero(libraryId)`, invoked from a desktop "Sync now" control
(desktop-only by choice; the commit still writes through the action layer so
results appear on mobile immediately).

Pull strategy (Zotero Web API v3):

- Read `zotero_sync.last_version` for the library; pass it as `?since=`.
- Fetch changed items (references, child notes) and changed annotations
  (`?itemType=annotation&since=<v>`; pull annotations library-wide rather than
  per-attachment, which historically errors). Use `format=json` (Zotero data) or
  `format=csljson` for bibliographic fields.
- Honor rate limiting: respect a `Backoff` header, back off on `429` using
  `Retry-After`, keep concurrency at or below 4.
- Resolve parents: a **child note** has `parentItem = reference`; an
  **annotation** is two hops (`annotation → attachment → reference`). Record
  `zotero_parent_key` so the walk isn't recomputed each sync.
- Upsert `source` (by `zotero_key`, compare `zotero_version`) and `annotation`
  (by `zotero_key`). Standalone notes → `annotation` with `source_id = null`.
- Embed new/changed annotation bodies and source abstracts into `chunk`.
- **Semantic matching**: for each reference and each note/highlight, compute
  candidate nodes by max chunk-similarity against node profiles (a node's own
  notes weighted up). Produce, for each, a top-1 score and a top1–top2 margin.
- Stage proposals: `node_source` and `annotation` rows with `status='proposed'`
  and `match_score`. Allow a "no match / create new node / skip" outcome — never
  force a weak best match.
- Optional accelerator: if a Zotero item carries a tag naming a node slug, treat
  it as a high-confidence prior and stage it as near-certain.
- On success, advance `zotero_sync.last_version` to the response's
  `Last-Modified-Version`.

The proposals land in the **same review queue** as RAG drafts and sheet diffs.

### 7.4 Spreadsheets (operational, one-way import with preview)

- **Export**: `exportOperational()` flattens `phase='operational'` nodes to rows.
  Include a hidden column carrying each node's `id` so a later import can match.
- **Import**: `previewImport(file)` diffs rows against the DB by node `id`
  (create / update / no-op), surfaces the diff for confirmation, and only
  `commitImport(diff)` writes — through the standard verbs. No live two-way sync.
  Treat the sheet as a disposable edit surface; the DB is source of truth.

### 7.5 Simulation (LLM as the user)

`startSimRun` opens a session; the agent then calls the same action-layer verbs
with `actor_type='agent'` and `sim_run_id` set, so every action lands in `event`
tagged to the run. Because the agent acts through the API (not the pixels), runs
are reproducible and cheap to analyze.

**Isolation (required).** A simulated run must not be able to mutate the real
graph or trigger real side effects (publishing, sending, mutating operational
nodes). Enforce this at three layers:

1. *Identity* — the agent authenticates with a server-side service credential,
   never a human session, and never passes through the login/edge gate. It runs
   inside the trusted backend.
2. *Authorization* — the action layer restricts agent-context calls to the
   simulation's own data target; an agent credential cannot write to the
   production (root) database branch.
3. *Data* — each `sim_run` executes against its **own Neon branch**, a
   copy-on-write fork of the production database created at run start and dropped
   at run end. Agent writes physically land on the throwaway branch, never the
   root, so isolation is a property of the infrastructure rather than of query
   discipline. Many runs can execute in parallel on separate branches.

**Persisting results.** Because the branch is discarded, the harness copies the
*measurements* back to the root database before dropping it: the `sim_run` row,
its `eval` rows, and the `actor_type='agent'` `event` rows. The graph mutations
that produced them stay on the branch and die with it. The root DB accumulates
the analysis you compare across hundreds of runs; the sandbox is disposable.

*Lower-effort fallback (not preferred):* run sims in the single production DB
with a nullable `sim_run_id` added to `node` and `edge`, where the real graph is
`sim_run_id IS NULL`. This works but depends on every query filtering correctly —
the bug-prone path that branch isolation exists to avoid. Use branches.

Metrics (`computeMetrics`) read the event log and the resulting (branch) graph.
The agreed evaluation target is **the quality of ideas that reach the
`operational` phase**, optionally scored against human benchmarks via `eval`
rows. Candidate outcome variables to compute per run (finalize the rubric — see
section 11): count and rate of ideas reaching `operational`, mean `eval.score` of
those ideas, number of `cross`/`contains` edges formed, and whether the same
supernodes self-organize across runs. Default simulations to cloud general models
with cost caps; thousands of runs against a premium model is a real bill.

---

## 8. RAG and model routing

- **Two model roles, both pluggable behind a router**: a *generator* (general
  chat model) and an *embedder*. No domain-specific ("scientific") model is in
  scope; general models plus good retrieval outperform domain fine-tunes for
  synthesis over your own corpus.
- **Chosen providers (cloud-first):**
  - *Generation* — the Claude API. Default to a mid-tier model (Sonnet) for most
    brainstorms; reserve the top model (Opus) for the heaviest synthesis, since
    output tokens dominate cost.
  - *Embeddings* — Voyage AI (`voyage-4` family, 1024-dim). Anthropic does not
    offer an embeddings endpoint, so embeddings are a separate provider and a
    separate API key. The `chunk.embedding` column is `vector(1024)` to match.
  - *Hugging Face is intentionally out of scope for now.* It belongs to the
    local-later seam (self-hosting an open generator or embedder); it is not part
    of the cloud build.
- **Embed at ingest** (annotations, node notes, source abstracts → `chunk`) and
  **embed the prompt at query time**. Retrieval is scope-constrained ANN search.
- **Re-embed on embedder change.** The `embed_model` column identifies stale
  vectors; the `vector(N)` dimension must match the active embedder. Never
  compare vectors across models in one search.
- **Router config** holds, per model id: provider, endpoint, auth (server-side),
  context window, and cost. Cloud entries now; a local entry is added later
  (section 9) without touching call sites.

---

## 9. Deployment topology

**Now — cloud-first, three platforms each doing what it's best at.**

- **Vercel** — the Astro front end at `phronos.org`, plus any thin/fast API
  routes. Not used for long-running work (serverless time limits, no persistent
  worker).
- **Railway** — the action-layer API service, the background **worker**, and the
  **job queue**. This is where the async, minutes-long, rate-limited work lives
  (brainstorm runs, Zotero sync). Always-on container, ~$5/mo Hobby at this scale.
  All server-side secrets (Claude, Voyage, Zotero keys, Neon connection string)
  are env vars here, never in the Vercel client bundle.
- **Neon** — serverless PostgreSQL with `pgvector` (graph + vectors + event log).
  Chosen over an always-on instance because it scales to zero when idle, which
  matches this app's bursty/agent workload, and because its copy-on-write
  **branching** is what isolates simulations (section 7.5).
  - *Scale-to-zero caveat:* a persistent connection pool held open from the
    Railway worker keeps Neon's compute "active" and defeats suspend (you'd pay
    for idle time). Use Neon's serverless/HTTP driver, or let the pool idle out,
    so suspend actually engages between bursts.
- **Cloudflare** — two roles: **Access** in front of `phronos.org` for auth (see
  section 10), and **R2** object storage if/when files (exports, any cached PDFs)
  need to live somewhere. R2's free tier is cheaper than reaching back into a
  bundled DB-platform tier for storage.
- **Generation/embeddings** via the Claude and Voyage APIs (section 8); **Zotero**
  via its Web API (`https://api.zotero.org`), key server-side on Railway.

Supabase is intentionally not used: for a single user its auth/storage/realtime
bundle is paid-for surface this app doesn't need, and its always-on compute model
fits worse than Neon's scale-to-zero.

**Later — local seams (already accounted for; do not design them out).**

1. **Local Zotero API**: the desktop client exposes the same endpoints at
   `http://localhost:23119/api/` with no auth and the same `?since=` semantics.
   Switching is a base-URL change plus dropping the auth header. Keep base URL +
   auth in connector config from day one.
2. **Local inference host**: an always-on GPU box reachable from the cloud app
   over a tunnel (e.g. Tailscale / Cloudflare Tunnel) — no open inbound ports,
   no client-to-model traffic. Add it as a router entry. Brainstorm is already
   async, so latency is a non-issue.
3. **Local embedder**: adding one means re-embedding (`embed_model` column) and
   changing the `vector(N)` dimension if the local model differs from voyage-4.

**Mobile**: ship the web app as a responsive PWA. Phone affordances are a
read-only zoomable graph for orientation plus an outline/list editor for
node/edge edits, and a form to enqueue brainstorms. All of it calls the same
action layer; do not build a separate mobile backend.

---

## 10. Security, authentication, and integrity

### Authentication model (single user)

There is no user-management system, by design. The app serves one person, so the
requirement is "let me in, keep everyone else out," not multi-tenant auth.

- **Edge gating (recommended).** Put **Cloudflare Access** in front of
  `phronos.org`. It authenticates each request against a federated identity
  provider (Google or GitHub) at Cloudflare's edge, *before* the request reaches
  Vercel or Railway, with a policy that allowlists exactly one identity (your
  email). Unauthenticated traffic never reaches the backend. Free at this scale.
- **Alternative / in-app.** Auth.js (NextAuth) or Better Auth with a single OAuth
  provider, sessions in Neon, and a one-identity allowlist enforced in the
  sign-in callback. Use this if the app needs an in-app user record (e.g. to
  stamp `event.actor_id`). The two can be combined (edge gate + thin app session).
- **No password store.** Do not build username/password, signup, or reset flows.
  Federate, allowlist one identity, and inherit the provider's MFA.
- **The real perimeter is the federated account.** Harden *it* with MFA or a
  passkey; that account, not the app, is the door worth protecting.
- **Account data is minimal**: a verified email/subject id and at most one user
  row. No PII pile, no login form — little to steal and nothing to brute-force.

### Agent / simulation isolation

- Agents never authenticate as a human and never pass the edge gate. They run
  server-side with a service credential and are tagged `actor_type='agent'`.
- Each simulation runs on its own ephemeral Neon branch; agent writes cannot
  reach the production (root) branch. The action layer additionally refuses
  agent-context writes targeted at the root branch (defense in depth).
- A simulated agent must never trigger real side effects (publish, send, mutate
  operational nodes); branch isolation enforces this structurally. See 7.5.

### Integrity constraints (for the implementer)

- The action layer is the only write path. No direct DB writes from any client.
- Credentials (Zotero, Claude, Voyage) are server-side only (on Railway); never
  sent to a client, never placed in URLs or query strings.
- Zotero is read-only upstream; never issue writes to the Zotero API.
- Nothing becomes `vetted`/`confirmed` without passing the review queue.
- `contains` edges are cycle-checked before insert.
- `event` is append-only; treat UPDATE/DELETE on it as a bug.
- `output.raw_body` is immutable after creation.
- Prefer `archiveNode` over `deleteNode` so provenance survives.

---

## 11. Build order (phased, with acceptance criteria)

**Phase 0 — Persistent graph + API.** Stand up Neon (with `pgvector`) and the
graph/notes verbs (`createNode`, `updateNode`, `setPhase`, `linkEdge` with cycle
check, `addNote`, `createSupernode`). Rewire `phase_constellation.jsx` to read
and write through the API instead of the seeded array. Ship responsive so the
phone works. Put the app behind Cloudflare Access (one-identity allowlist) from
the first deploy so it is never publicly open.
*Done when*: the existing UI loads from and persists to the DB; nodes, edges,
supernodes, phases, and node notes survive reload; every mutation appears in
`event`; the same UI is usable on a phone; only the allowlisted identity can
reach it.

**Phase 1 — References + spreadsheets.** Zotero connector (read-only, `?since=`
cursor, rate-limit handling, parent-chain resolution), embedding pipeline into
`chunk`, semantic matching, and the unified review queue. Operational export and
one-way preview import.
*Done when*: a sync pulls only changed items, stages proposals sorted by
uncertainty, and commits confirmed matches; node notes and Zotero text are
embedded; operational nodes round-trip through a spreadsheet via a previewed,
confirmed import.

**Phase 2 — Brainstorm + synthesis.** RAG assembly (direct + scope-constrained
retrieval), the model router (cloud general models), async runs, the output
lifecycle, and `approveOutput` publishing with full lineage.
*Done when*: a scoped prompt produces a draft tied to its retrieved chunks; a
human edits and approves it; the vetted node appears on the graph and traces
back through `output → run → run_chunk → chunk → annotation → source`; a
brainstorm can be enqueued from the phone.

**Phase 3 — Simulation + deploy.** Sim harness (agent drives the action layer via
a server-side service token, on a per-run Neon branch), event-log analytics,
`eval` scoring, and the `computeMetrics` rubric. Metrics copied to the root DB
before each branch is dropped. Deploy at `phronos.org`.
*Done when*: an agent run executes on its own branch without touching the root
graph; its `sim_run`, `eval`, and agent `event` rows persist to root after the
branch is dropped; metrics on ideas reaching `operational` are computed across
many runs; results are comparable to human-benchmark `eval` scores.

Documentation is maintained alongside each phase, not deferred.

---

## 12. Open questions

- **EVAL rubric.** "Quality of ideas reaching `operational`" needs concrete
  dimensions before the simulation harness can produce signal rather than noise.
  Define 2–3 scored dimensions (e.g. specificity, novelty, feasibility) and
  whether scoring is human, model-judge, or both, and pin the human-benchmark
  comparison method. This is the one decision left unresolved by design; resolve
  it before Phase 3.

---

## Glossary

- **Phase** — maturation state of an idea: divergent, convergent, operational.
- **Tier** — structural level of a node in the constellation hierarchy.
- **Context (ctx)** — a domain tag grouping nodes (stanford, phronos, etc.).
- **Supernode** — a `kind='super'` node whose `contains` edges define a cluster;
  also a saved RAG scope.
- **Scope** — the set of nodes/edges selected to constrain a brainstorm; usually
  a supernode.
- **Output** — a knowledge-object produced by a run, in its review lifecycle.
- **Vetted** — an output a human approved and published to the graph.
- **Proposal** — a staged, not-yet-confirmed link or annotation from ingestion,
  synthesis, or import, awaiting review.
- **Event** — an append-only record of one mutation or one simulated action.
- **Edge gating** — authenticating requests at Cloudflare's edge (Cloudflare
  Access) before they reach the app, with a one-identity allowlist.
- **Sim branch** — an ephemeral Neon copy-on-write branch that a single simulated
  run executes against and that is dropped when the run ends.
