# ADR 0008 — Simulation isolation (per-run Neon branch)

**Status:** accepted — build in Phase 3 · **Date:** 2026-06-24

## Decision

A simulated run drives the **same action-layer verbs** as a human, with
`actorType='agent'` and `sim_run_id` set, executing against its **own ephemeral
Neon branch** — a copy-on-write fork of production created at run start and
dropped at run end. Isolation is enforced at three layers (ARCHITECTURE §7.5):

1. **Identity** — the agent authenticates with a server-side **service token**, a
   new path in `auth.ts` that yields an agent `ActorContext` and never passes
   through the Cloudflare Access edge gate.
2. **Authorization** — the action layer refuses agent-context writes aimed at the
   root branch (defense in depth).
3. **Data** — the agent's `createActions(db)` is bound to the **branch**
   connection string, so writes physically land on the throwaway branch.

## Rationale

Isolation as a property of **infrastructure**, not query discipline — the
lower-effort `sim_run_id IS NULL` filter approach is bug-prone (a single missed
filter contaminates the real graph). The two Phase 0 seams that make this cheap
already exist: every verb takes an `ActorContext`, and `createActions(db)` is
parameterized by connection string. No verb changes are needed.

## Consequences

- **Persisting results:** the branch is discarded, so the harness copies the
  *measurements* — the `sim_run` row, its `eval` rows, and the `actor_type='agent'`
  `event` rows — back to root before dropping the branch. Graph mutations die with
  the branch. Root accumulates the cross-run analysis.
- **Generation inside a sim runs inline against the branch (D-5)**, not via the
  root pg-boss queue, so jobs never leak across branches.
- **Infra to add:** Neon API access (project id + key) to create/drop branches;
  many runs can execute in parallel on separate branches.
- **Cost:** default sims to cheap models with caps (see ADR 0006); thousands of
  runs against a premium model is a real bill.
- **Eval rubric (OQ-1) is still open** — the target is "quality of ideas reaching
  `operational`"; pin 2–3 dimensions + a judge before building `computeMetrics`.
