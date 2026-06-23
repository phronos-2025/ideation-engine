# Phronos — Product Requirements Document

| | |
|---|---|
| **Product** | Phronos — a personal knowledge-graph system for capturing, connecting, researching, and operationalizing ideas |
| **Version** | 1.0 |
| **Date** | 2026-06-22 |
| **Status** | Baselined for build. One open item (simulation evaluation rubric, OQ-1). |
| **Owner** | Project owner (single user) |
| **Related documents** | `ARCHITECTURE.md` (technical spec), `CLAUDE.md` (build context for the coding agent) |

### Revision history

| Version | Date | Author | Notes |
|---|---|---|---|
| 1.0 | 2026-06-22 | — | Initial baseline. Synthesizes all requirements and decisions from the originating design thread. |

---

## 1. Summary

Phronos is a single-user application that treats ideas as a graph: ideas are
**nodes**, relationships are **edges**, and ideas mature through three **phases**
(`divergent → convergent → operational`). Around that graph sit five capabilities:
a visual editing/exploration UI; a Zotero-backed reference layer; an LLM
"brainstorm" that researches a selected slice of the graph under retrieval
constraints; a human-in-the-loop review that vets research before it joins the
graph; spreadsheet round-tripping for operational ideas; and a simulation harness
that lets an LLM drive the system as a stand-in user across many runs.

This PRD is the requirements source of truth. The how — schema, API contract,
deployment — lives in `ARCHITECTURE.md`.

## 2. Problem and intent

The owner manages a large, multi-context body of ideas (research, library
infrastructure, personal) that currently lives only as a visual constellation
with no persistence, no sourcing, and no path from a raw idea to a vetted,
operational one. The intent is a system that (a) persists and structures that
graph, (b) attaches primary-source evidence to it, (c) uses LLMs to extend it
without letting unvetted model output contaminate it, and (d) is observable
enough to study how ideas move from exploratory to operational — including by
simulation.

## 3. Goals and non-goals

**Goals (v1)**

- Replace the prototype's in-memory data with a persistent, editable graph.
- Make every workflow reachable from desktop and phone.
- Keep unvetted LLM output and unverified source matches behind a human gate.
- Keep running cost low and keep a clean path to self-hosting later.
- Be drivable programmatically so an LLM agent can simulate a user.

**Non-goals (v1)** — see §11 for the full out-of-scope list. In brief: no
multi-user accounts, no domain-specific "scientific" LLMs, no live two-way
spreadsheet sync, no native mobile apps, no writing back to Zotero, no local
inference yet.

## 4. Users

- **Primary user** — the owner. Single human identity; no other accounts exist.
- **Simulated agents** — LLM processes that act as the user for simulation. They
  are not accounts and never authenticate as a human (see FR-H4, FR-I3).

## 5. Product principles

These are the cross-cutting decisions the rest of the requirements assume.

- **API-first. One write path.** Web UI, mobile, spreadsheet sync, and the
  simulation agent are all clients of one typed action layer. Nothing mutates the
  store directly. This is what makes mobile, sheet import, and "LLM as user" the
  same code instead of four implementations.
- **Append-only event log.** Every mutation is logged once and read twice — as
  provenance for vetted ideas and as the data for simulation analysis.
- **Human-gated vetting.** Ideas and source links enter as proposals/drafts and
  reach the graph only after review.
- **Phases are the spine.** `operational` is the only phase that touches
  spreadsheets; exploratory ideas stay out of the structured planning surface
  until promoted.
- **Cost- and exit-conscious.** Cloud-first, scale-to-zero where possible, with
  model and host seams kept swappable.

### 5.1 Synthesis notes (where distinct features are one mechanism)

Several stated requirements reduce to shared machinery; building them as one
thing is cheaper and keeps the model coherent.

- **Selection = supernode = RAG scope.** A saved selection, a cluster's metadata
  home, and a retrieval boundary are the same object (FR-B2, FR-A4, FR-D2).
- **Annotations = the embedding corpus.** Node notes, Zotero highlights, and
  review comments are the same text a human reads and the text retrieval embeds
  (FR-B5, FR-C2, FR-D3).
- **One event log = provenance + simulation analytics.** The record of how a
  vetted idea was produced has the same shape as the record of an agent's action
  (FR-E3, FR-H2).
- **One review queue = three producers.** Zotero ingestion, RAG synthesis, and
  sheet import all emit proposals into the same accept/edit/reject surface
  (FR-E4).

## 6. Functional requirements

Priority: **P0** = required for first usable build; **P1** = core product; **P2**
= later. Phase mapping in §12.

### A. Knowledge graph and visual UI

| ID | Requirement | Priority |
|---|---|---|
| FR-A1 | Interactive graphical UI to create, view, manipulate, and explore the node/edge graph, evolved from the existing force-directed constellation prototype. | P0 |
| FR-A2 | Visually encode and **filter/display by category and layer** — phase (divergent/convergent/operational), tier, and context. | P0 |
| FR-A3 | Visually distinguish relationship types: hierarchy, lateral (cross), and containment; surface cross-connections. | P1 |
| FR-A4 | Select one or many nodes/edges as the unit of action for downstream workflows. | P1 |

### B. Data model and structure

| ID | Requirement | Priority |
|---|---|---|
| FR-B1 | Persist nodes and edges, with metadata, in a database. | P0 |
| FR-B2 | Recursive nesting via **supernodes**; a supernode holds the joint metadata for a cluster of nodes/edges. | P0 |
| FR-B3 | A node may belong to **multiple** supernodes; containment cycles are disallowed. | P0 |
| FR-B4 | Phase state machine `divergent → convergent → operational`; `operational` is the spreadsheet-syncable state. | P0 |
| FR-B5 | Attach free-form notes to a node; notes are usable as RAG prompt context. | P1 |

### C. Reference management (Zotero)

| ID | Requirement | Priority |
|---|---|---|
| FR-C1 | Mirror Zotero references (bibliographic metadata) into the system; **read-only upstream** (never write back). | P1 |
| FR-C2 | Ingest Zotero notes and PDF annotations (highlights) and attach them to nodes. | P1 |
| FR-C3 | Link references to nodes (many-to-many); store derived knowledge attached to specific nodes/edges. | P1 |
| FR-C4 | Ingestion UI (desktop-only): pull from the Zotero Web API, **semantically match** references and notes to candidate nodes, and present matches for verification/editing with the **most uncertain first**, allowing "no match / new node / skip". | P1 |
| FR-C5 | Incremental, **idempotent** sync (since-cursor, stable keys, no duplicates on re-run). | P1 |
| FR-C6 | Use Zotero metadata in RAG as both structured filters (year, tags, creators) and embedded text (abstracts). | P1 |

### D. Brainstorm (RAG)

| ID | Requirement | Priority |
|---|---|---|
| FR-D1 | Select nodes/edges (or a supernode), add a prompt, and send to a RAG-LLM to produce research. | P1 |
| FR-D2 | Retrieval is **constrained to the selected scope**; the user controls which nodes/edges are in scope. | P1 |
| FR-D3 | Assemble context from **direct** sources (scope's notes, linked references, metadata) plus **retrieved** sources (vector similarity within scope). | P1 |
| FR-D4 | Pluggable model router; general-purpose models, cloud now, with a local option later. | P1 |
| FR-D5 | Runs execute asynchronously via a queue and can be enqueued from the phone. | P1 |

### E. Synthesis and review

| ID | Requirement | Priority |
|---|---|---|
| FR-E1 | RAG output is marked for review and presented for user editing. | P1 |
| FR-E2 | On approval, publish to the graph as a **vetted** knowledge object — either a new node or an attachment to an existing one. | P1 |
| FR-E3 | Vetted objects carry **full provenance**: prompt, model, retrieved sources, and human editor, traceable back to primary sources. | P1 |
| FR-E4 | A **single review queue** serves Zotero ingestion, RAG synthesis, and sheet import; accept/edit/reject; sort by match uncertainty. | P1 |

### F. Spreadsheet I/O

| ID | Requirement | Priority |
|---|---|---|
| FR-F1 | Export `operational`-phase ideas to a spreadsheet. | P1 |
| FR-F2 | Import via spreadsheet to update node structure (operational), **one-way with a diff preview** before commit; rows keyed by stable node id. | P1 |
| FR-F3 | Google Sheets hook as an import surface. | P2 |

### G. Mobile

| ID | Requirement | Priority |
|---|---|---|
| FR-G1 | Access the UI from a phone (responsive PWA). | P0 |
| FR-G2 | Add and edit nodes and edges from the phone (outline editor + read-only zoomable graph). | P1 |
| FR-G3 | Queue RAG-LLM research from the phone. | P1 |

### H. Simulation

| ID | Requirement | Priority |
|---|---|---|
| FR-H1 | Run simulations in which an LLM acts as the user through the action API. | P2 |
| FR-H2 | Run and analyze hundreds-to-thousands of runs, with every action structurally logged. | P2 |
| FR-H3 | Evaluate runs on the **quality of ideas that reach `operational`**, with the option to score against human benchmarks. | P2 |
| FR-H4 | **Agent isolation**: agents act via a service token on a per-run isolated DB branch; they cannot mutate the real graph or fire real side effects; run metrics persist to the root store. | P2 |

### I. Authentication and access

| ID | Requirement | Priority |
|---|---|---|
| FR-I1 | Single-user access via a **federated identity** (Google/GitHub) with a **one-identity allowlist**; no signup, no password store. | P0 |
| FR-I2 | **Edge gating** so unauthenticated traffic never reaches the application. | P0 |
| FR-I3 | Keep the owner's account data separate from simulated agents (satisfied by FR-H4 plus actor tagging). | P0 |

### J. Hosting and deployment

| ID | Requirement | Priority |
|---|---|---|
| FR-J1 | Host the application at `phronos.org`. | P1 |
| FR-J2 | Cloud-first, cost-conscious stack that **preserves a local-everything seam** (local models, local Zotero API) for later. | P0 |

### K. Documentation

| ID | Requirement | Priority |
|---|---|---|
| FR-K1 | Document the architecture clearly and **illustrate it visually**. | P0 |
| FR-K2 | Prepare the specification for handoff to a coding agent (commented, with conventions and build order). | P0 |

## 7. Non-functional requirements

- **NFR-1 Security.** Credentials server-side only; never in URLs or query
  strings; Zotero read-only; the federated account (with MFA/passkey) is the real
  perimeter.
- **NFR-2 Integrity.** The action layer is the sole write path; the event log is
  append-only; vetting is review-gated; deletes are soft by default.
- **NFR-3 Cost.** Target roughly $5–10/month infrastructure plus metered model
  usage; scale-to-zero database; simulations default to cheaper models with caps.
- **NFR-4 Idempotency.** Zotero sync re-runs without creating duplicates.
- **NFR-5 Portability.** Pluggable model router; config-driven seams for local
  Zotero API, local inference, and local embedder.
- **NFR-6 Performance/UX.** Long jobs run async; retrieval uses vector ANN search;
  the UI is responsive on a phone.

## 8. Decisions log (resolved during design)

| # | Decision point | Choice | Rationale |
|---|---|---|---|
| D-1 | Supernode membership | A node may belong to many supernodes | A goal can sit in several clusters at once; single membership would be fought. |
| D-2 | Hosting posture | Cloud-first now; local-model option later | Avoids standing up always-on GPU before there's value; seam kept open. |
| D-3 | Domain ("scientific") LLMs | Dropped; general models only | General model + good retrieval beats domain fine-tunes for synthesis over your own corpus. |
| D-4 | Spreadsheet sync | One-way import with preview | Two-way live sync is where silent data loss breeds. |
| D-5 | Simulation evaluation target | Quality of ideas reaching `operational`; compare vs human benchmarks | Gives runs a meaningful outcome variable. Rubric still open (OQ-1). |
| D-6 | Zotero access | Web API v3 now; local desktop API later | Stable item keys + incremental `since` sync; notes and annotations both reachable. |
| D-7 | Database | Neon (Postgres + pgvector) | Scale-to-zero fits a bursty/agent workload; copy-on-write branches isolate sims; pgvector built in. |
| D-8 | Generation / embeddings | Claude (generation) + Voyage (embeddings, 1024-dim) | Anthropic has no embeddings endpoint; Voyage is the paired provider. Hugging Face deferred. |
| D-9 | Compute / hosting split | Vercel (front), Railway (API + worker + queue), Neon (data); Cloudflare Access + R2 | Each platform does what it's best at; the async worker is why Railway stays. Supabase dropped as paid-for surface a single user doesn't need. |
| D-10 | Auth | Federated identity + one-identity allowlist + edge gating; no password store | Right-sized for one user; inherits provider MFA; minimal attack surface. |
| D-11 | Agent/data isolation | Per-run Neon branch + service token | Isolation by infrastructure, not by query discipline. |

## 9. Success metrics

- The persistent graph replaces the prototype's seeded data and is editable from
  desktop and phone, with every mutation logged. *(Phase 0)*
- A scoped brainstorm yields a vetted node whose lineage traces to its retrieved
  primary sources. *(Phase 2)*
- A Zotero sync idempotently stages and commits matched references/annotations,
  uncertain matches surfaced first. *(Phase 1)*
- Operational ideas round-trip through a previewed spreadsheet import. *(Phase 1)*
- Simulations produce persisted, comparable metrics on operational-idea quality
  across many runs. *(Phase 3)*
- Monthly infrastructure cost stays in the target band. *(ongoing)*

## 10. Open questions and risks

- **OQ-1 (open) — Simulation evaluation rubric.** "Quality of ideas reaching
  `operational`" needs 2–3 concrete scored dimensions and a judge (human, model,
  or both) before the harness can produce signal instead of noise. This is the
  only requirement left undecided; resolve before Phase 3.
- **R-1 — Semantic match quality on sparse nodes.** Early-stage nodes with only a
  label match poorly; the ingestion UI must allow "no match / new node" rather
  than forcing weak links.
- **R-2 — Scale-to-zero defeated by a held-open connection pool.** Use the
  serverless driver / let pools idle, or the cost benefit disappears.
- **R-3 — Simulation realism.** The agent only exercises what the action API
  exposes; metrics must be defined up front or thousands of runs yield no insight.

## 11. Out of scope (v1)

- Multi-user accounts, signup, password management, multi-tenant isolation.
- Domain-specific / "scientific" LLMs (PubMed/arxiv-tuned).
- Live two-way spreadsheet sync (FR-F2 is one-way with preview).
- Native mobile applications (mobile is a responsive PWA).
- Writing annotations or any data back to Zotero.
- Hugging Face / self-hosted model hosting; local inference and local embedder
  (deferred to a later phase, with seams preserved per FR-J2).

## 12. Phased roadmap

| Phase | Scope | Requirements |
|---|---|---|
| **0 — Persistent graph + API + access** | Database, action layer, graph/notes verbs, prototype rewired to the API, responsive, behind edge auth from first deploy. | FR-A1–A2, FR-B1–B5, FR-G1, FR-I1–I3, FR-J2, FR-K1–K2 |
| **1 — References + spreadsheets** | Zotero connector + ingestion UI + embedding pipeline + unified review queue; operational export and one-way import. | FR-A3–A4, FR-C1–C6, FR-E4, FR-F1–F2 |
| **2 — Brainstorm + synthesis** | RAG assembly, model router, async runs, output lifecycle, vetted publishing with lineage; enqueue from phone. | FR-D1–D5, FR-E1–E3, FR-G2–G3 |
| **3 — Simulation + deploy** | Sim harness on isolated branches, analytics, eval scoring; deploy at phronos.org. | FR-H1–H4, FR-J1 |

## 13. Requirement traceability (original asks → requirement IDs)

| Original ask (from the design thread) | Mapped to |
|---|---|
| 1. Graphical UI; display by categories/layers | FR-A1, FR-A2 |
| 2. Database for node/edge ideas | FR-B1 |
| 3. Recursive nesting; supernodes for clusters | FR-B2, FR-B3 |
| 4. Reference manager (Zotero); derived knowledge on nodes/edges | FR-C1–C3 |
| 5. Brainstorm: select + prompt → RAG-LLM | FR-D1–D3 |
| 6. Synthesis: review → edit → vetted publish; model choice; scoped RAG | FR-E1–E3, FR-D2, FR-D4 |
| 7. Export operational ideas to spreadsheet | FR-F1 |
| 8. Import via spreadsheet to update structure | FR-F2, FR-F3 |
| 9. Mobile access | FR-G1 |
| 10. Add/edit nodes & edges from phone | FR-G2 |
| 11. Queue RAG-LLM research from phone | FR-G3, FR-D5 |
| 12. Host at phronos.org | FR-J1 |
| 13. Architecture documented + illustrated | FR-K1 |
| 14. Run and analyze simulations (LLM as user) | FR-H1–H4 |
| (added) Auth / keep bots out / separate sim data | FR-I1–I3, FR-H4 |
| (added) Vector search + embedding model | FR-D3, FR-C6 |
| (added) Node notes in RAG | FR-B5 |
| (added) Unified review queue | FR-E4 |
| (added) Cost-driven hosting choices | FR-J2, NFR-3, D-7–D-11 |

## 14. References

- `ARCHITECTURE.md` — schema, action-layer contract, workflows, deployment.
- `CLAUDE.md` — standing build context and invariants for the coding agent.

## 15. Glossary

- **Phase** — maturation state of an idea: divergent, convergent, operational.
- **Tier / context** — structural level and domain tag of a node.
- **Supernode** — a node whose containment edges define a cluster; also a saved
  RAG scope.
- **Scope** — the nodes/edges selected to constrain a brainstorm.
- **Vetted object** — model research a human approved and published to the graph.
- **Proposal** — a staged, not-yet-confirmed link/annotation/import row awaiting
  review.
- **Event** — an append-only record of one mutation or one simulated action.
- **Sim branch** — an ephemeral database branch a single simulated run uses and
  that is dropped afterward.
