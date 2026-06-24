# ADR 0007 — One review queue, three producers

**Status:** accepted — build in Phase 1, extend in Phase 2 · **Date:** 2026-06-24

## Decision

A **single review queue** serves all three producers — Zotero ingestion, RAG
synthesis, and spreadsheet import. `getReviewQueue(filter)` returns a unified
`ReviewItem[]` with a discriminated `producer` field; one accept/edit/reject
surface (the **Review** tab) handles them all. Define the `ReviewItem` shape to
cover all three from the start, even though synthesis drafts arrive in Phase 2.

```ts
type ReviewItem =
  | { producer: 'zotero';  kind: 'node_source' | 'annotation'; id; matchScore; margin; ... }
  | { producer: 'sheet';   kind: 'row_diff';     diff; ... }
  | { producer: 'synthesis'; kind: 'output';     outputId; runId; ... };
```

Sorting must support **most-uncertain-first**: low top score (orphan candidate)
or small top1–top2 margin (ambiguous match).

## Rationale

Invariant #3 / PRD FR-E4: nothing reaches the graph as "vetted"/"confirmed"
without passing one human gate. Three separate review surfaces would triplicate
UI and let producers drift. Fixing the union type now avoids refactoring the
queue when Phase 2 adds drafts.

## Consequences

- Proposals are ordinary rows with `status='proposed'` (`node_source`,
  `annotation`) and draft `output` rows with `status='draft'`; the queue is a
  read that merges them — no new "queue" table.
- **Uncertainty storage (D-4):** `annotation` can stash the top1–top2 gap in its
  `meta` jsonb, but `node_source` has only `match_score`. Add a `margin real`
  column to `node_source` in a Phase 1 migration.
- Confirm/reject transition `status` (`proposed → confirmed | rejected`);
  `editProposalMatch` re-points then confirms. In simulation, the agent stands in
  for the human at this same gate.
- Never force a weak match — "no match / create new / skip" is always allowed
  (PRD R-1).
