-- Phronos canonical schema. Transcribed from STARTER-ARCHITECTURE.md §5.
-- This SQL file IS the source of truth for the database shape; src/schema.ts is
-- a typed Drizzle mirror kept in sync with it. Three corrections vs. the spec
-- DDL are marked [FIX] inline (see docs/adr/0004-schema-corrections.md):
--   1. owner_type enum includes 'annotation' (chunk can be owned by an annotation;
--      invariant #5 / §7.1 retrieval require it).
--   2. sim_run is defined BEFORE event so event.sim_run_id's FK resolves.
--   3. event.actor_id is a nullable uuid derived from the Cloudflare Access JWT
--      subject by the action layer (no user table in the single-user model).

-- Extensions -----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector

-- Enumerated types -----------------------------------------------------------
CREATE TYPE phase           AS ENUM ('divergent', 'convergent', 'operational');
CREATE TYPE edge_type       AS ENUM ('parent', 'cross', 'contains');
CREATE TYPE node_kind       AS ENUM ('idea', 'super', 'vetted');
-- [FIX 1] 'annotation' added: chunk.owner_type points at the text's origin,
-- which includes annotations (the embedding corpus). The annotation table's
-- own owner_type simply never uses the 'annotation' value.
CREATE TYPE owner_type      AS ENUM ('node', 'edge', 'source', 'output', 'annotation');
CREATE TYPE annotation_kind AS ENUM ('note', 'highlight', 'review_comment', 'derived');
CREATE TYPE review_status   AS ENUM ('proposed', 'in_review', 'confirmed', 'rejected');
CREATE TYPE output_status   AS ENUM ('draft', 'in_review', 'approved', 'rejected');
CREATE TYPE actor_type      AS ENUM ('user', 'agent');

-- NODE -----------------------------------------------------------------------
CREATE TABLE node (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label       text NOT NULL,
  tier        text NOT NULL,                  -- life_track|realm|network|initiative|goal (configurable)
  phase       phase NOT NULL DEFAULT 'divergent',
  ctx         text,                           -- context tag; nullable
  kind        node_kind NOT NULL DEFAULT 'idea',
  body        text,                           -- canonical text shown on the graph
  archived    boolean NOT NULL DEFAULT false, -- prefer archiving over hard delete
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
  UNIQUE (source_id, target_id, type)
);
CREATE INDEX edge_source_idx ON edge (source_id);
CREATE INDEX edge_target_idx ON edge (target_id);
-- 'contains' multi-membership is intentional; cycle prevention is enforced in
-- the action layer (recursive descent before insert), not by a DB constraint.

-- SOURCE (Zotero mirror; read-only upstream) ---------------------------------
CREATE TABLE source (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zotero_key     text UNIQUE,
  zotero_version bigint,
  item_type      text,
  title          text,
  creators       jsonb,
  year           int,
  doi            text,
  abstract       text,
  tags           text[],
  raw            jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX source_tags_idx ON source USING gin (tags);

-- NODE_SOURCE (M2M: which references support which nodes) ---------------------
CREATE TABLE node_source (
  node_id     uuid NOT NULL REFERENCES node(id)   ON DELETE CASCADE,
  source_id   uuid NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  role        text,
  status      review_status NOT NULL DEFAULT 'confirmed',
  match_score real,
  PRIMARY KEY (node_id, source_id)
);
CREATE INDEX node_source_source_idx ON node_source (source_id);
CREATE INDEX node_source_status_idx ON node_source (status);

-- ANNOTATION (polymorphic attached text) -------------------------------------
CREATE TABLE annotation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type        owner_type NOT NULL,         -- node | edge | source | output
  owner_id          uuid NOT NULL,
  source_id         uuid REFERENCES source(id) ON DELETE SET NULL,
  zotero_key        text,
  zotero_parent_key text,
  kind              annotation_kind NOT NULL,
  body              text NOT NULL,
  meta              jsonb,
  status            review_status NOT NULL DEFAULT 'confirmed',
  match_score       real,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX annotation_owner_idx ON annotation (owner_type, owner_id);
CREATE UNIQUE INDEX annotation_zotero_key_idx ON annotation (zotero_key) WHERE zotero_key IS NOT NULL;
-- owner_type/owner_id is a polymorphic reference (no FK); the action layer owns
-- referential integrity and cascade-on-archive.

-- CHUNK (embedding corpus) ---------------------------------------------------
CREATE TABLE chunk (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type  owner_type NOT NULL,             -- node | source | annotation | output
  owner_id    uuid NOT NULL,
  text        text NOT NULL,
  embedding   vector(1024),                    -- 1024 = Voyage voyage-4 family
  embed_model text NOT NULL,                    -- which embedder produced this vector
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chunk_owner_idx ON chunk (owner_type, owner_id);
-- Cosine ANN index (HNSW). Fine to create on an empty table; rebuild later once a
-- representative amount of data exists. Never mix embed_model values in one search.
CREATE INDEX chunk_embedding_idx ON chunk USING hnsw (embedding vector_cosine_ops);

-- SIM_RUN [FIX 2] defined before EVENT so event.sim_run_id FK resolves --------
CREATE TABLE sim_run (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario    text NOT NULL,
  agent_model text NOT NULL,
  config      jsonb,
  status      text NOT NULL DEFAULT 'running',  -- running | done | failed
  metrics     jsonb,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz
);

-- RUN (a brainstorm execution) -----------------------------------------------
CREATE TABLE run (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id       uuid REFERENCES node(id) ON DELETE SET NULL,
  scope_snapshot jsonb,
  model          text NOT NULL,
  embed_model    text NOT NULL,
  prompt         text NOT NULL,
  params         jsonb,
  status         text NOT NULL DEFAULT 'queued',-- queued | running | done | failed
  error          text,
  created_by     uuid,
  actor_type     actor_type NOT NULL DEFAULT 'user',
  sim_run_id     uuid REFERENCES sim_run(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz
);
CREATE INDEX run_status_idx ON run (status);
CREATE INDEX run_sim_idx    ON run (sim_run_id);

-- RUN_CHUNK (retrieval provenance) -------------------------------------------
CREATE TABLE run_chunk (
  run_id    uuid NOT NULL REFERENCES run(id)   ON DELETE CASCADE,
  chunk_id  uuid NOT NULL REFERENCES chunk(id) ON DELETE CASCADE,
  score     real,
  rank      int,
  PRIMARY KEY (run_id, chunk_id)
);

-- OUTPUT (the knowledge-object lifecycle) ------------------------------------
CREATE TABLE output (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         uuid NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  raw_body       text NOT NULL,                 -- FROZEN; never edited
  edited_body    text,
  status         output_status NOT NULL DEFAULT 'draft',
  publish_mode   text,                          -- 'create' | 'attach'
  target_node_id uuid REFERENCES node(id) ON DELETE SET NULL,
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX output_status_idx ON output (status);

-- EVAL -----------------------------------------------------------------------
CREATE TABLE eval (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id   uuid REFERENCES output(id) ON DELETE CASCADE,
  node_id     uuid REFERENCES node(id)   ON DELETE CASCADE,
  scorer      text NOT NULL,                    -- 'human' | <model id> | <rubric id>
  rubric      text,
  score       real,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (output_id IS NOT NULL OR node_id IS NOT NULL)
);

-- EVENT (append-only spine: provenance + simulation analytics) ---------------
CREATE TABLE event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type  actor_type NOT NULL,              -- user | agent
  actor_id    uuid,                             -- [FIX 3] derived from CF Access JWT subject
  action      text NOT NULL,                    -- action-layer verb name
  target_type text,
  target_id   uuid,
  payload     jsonb,
  sim_run_id  uuid REFERENCES sim_run(id) ON DELETE SET NULL,
  session_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_sim_idx     ON event (sim_run_id);
CREATE INDEX event_action_idx  ON event (action);
CREATE INDEX event_created_idx ON event (created_at);
-- Append-only: treat UPDATE/DELETE on this table as a bug.

-- ZOTERO_SYNC (incremental sync cursor) --------------------------------------
CREATE TABLE zotero_sync (
  library_id     text PRIMARY KEY,
  last_version   bigint NOT NULL DEFAULT 0,
  last_synced_at timestamptz
);

-- updated_at maintenance -----------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER node_set_updated_at       BEFORE UPDATE ON node       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER source_set_updated_at     BEFORE UPDATE ON source     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER annotation_set_updated_at BEFORE UPDATE ON annotation FOR EACH ROW EXECUTE FUNCTION set_updated_at();
