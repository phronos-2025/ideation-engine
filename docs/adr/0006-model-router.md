# ADR 0006 — Model router (one seam for embedder + generator)

**Status:** accepted — build in Phase 1 · **Date:** 2026-06-24

## Decision

Introduce a single **model router** that both LLM roles call through: a
*generator* (Claude) and an *embedder* (Voyage). Per model id the router holds
`{ provider, endpoint, auth (server-side), context_window, dimensions, cost,
cap }`. Call sites name a model id; they never embed a provider SDK directly.

Build it in **Phase 1** for the embedder (the first model used), so Phase 2's
generator drops into the same seam, and a local provider can be added later
without touching call sites.

## Rationale

The spec (ARCHITECTURE §8, NFR-5) requires both roles pluggable behind a router,
cloud now and local-capable later. Adding Voyage inline in Phase 1 and then
retrofitting a router in Phase 2 would mean reworking the embedding pipeline.
Building the router with the *first* model keeps every later model — Opus for
heavy synthesis, a local embedder, a tunneled local generator — a config entry.

## Consequences

- **Credentials stay server-side** (Railway env): `ANTHROPIC_API_KEY`,
  `VOYAGE_API_KEY`. Never shipped to a client (invariant #8).
- `chunk.embed_model` records which embedder produced each vector; switching
  embedders means re-embedding and, if dimensions differ from `vector(1024)`, a
  schema change (a documented later seam).
- **Cost caps** live in router config — important for Phase 3, where thousands of
  simulated runs against a premium model is a real bill. Default sims to cheap
  models with caps.
- Likely home: a small `packages/llm` (or `core/models`) module exporting
  `embed(modelId, texts)` and `generate(modelId, prompt, params)`.
