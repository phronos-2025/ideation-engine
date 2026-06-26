/**
 * Model router config (ADR 0006). One registry maps a model id → its provider,
 * role, and economics. `embed()` and `generate()` dispatch purely off this map.
 *
 * Server-side only — provider keys (`ANTHROPIC_API_KEY`, later `VOYAGE_API_KEY`)
 * live in the Railway/worker env and never reach a client bundle (invariant #8 /
 * NFR-1).
 *
 * Two swappable surfaces sit behind the registry:
 *   - generation: real Claude via @anthropic-ai/sdk.
 *   - embedding:  a deterministic stub today; `voyage-4` drops in by setting
 *                 VOYAGE_API_KEY (see `activeEmbedModel()`), no code change.
 */

export type Provider = 'anthropic' | 'voyage' | 'stub';
export type ModelRole = 'generator' | 'embedder';

export interface ModelCost {
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens (generators only). */
  outputPerMTok?: number;
}

export interface ModelConfig {
  provider: Provider;
  role: ModelRole;
  /** Embedding width — embedders only; matches the `chunk.embedding` column. */
  dims?: number;
  cost: ModelCost;
  /** Generators: max output tokens. Embedders: max input tokens per request. */
  cap: number;
}

/**
 * The model registry. Keys are the exact ids stamped onto `run.model` /
 * `run.embed_model` / `chunk.embed_model`. Costs for Claude are list price;
 * `voyage-4` cost is approximate until a key + invoice confirm it.
 */
export const MODELS = {
  'claude-sonnet-4-6': {
    provider: 'anthropic',
    role: 'generator',
    cost: { inputPerMTok: 3, outputPerMTok: 15 },
    cap: 64000,
  },
  'claude-opus-4-8': {
    provider: 'anthropic',
    role: 'generator',
    cost: { inputPerMTok: 5, outputPerMTok: 25 },
    cap: 128000,
  },
  'voyage-4': {
    provider: 'voyage',
    role: 'embedder',
    dims: 1024,
    cost: { inputPerMTok: 0.12 }, // approximate — confirm against Voyage pricing
    cap: 32000,
  },
  'stub-embed-1024': {
    provider: 'stub',
    role: 'embedder',
    dims: 1024,
    cost: { inputPerMTok: 0 },
    cap: 0,
  },
} satisfies Record<string, ModelConfig>;

export type ModelId = keyof typeof MODELS;

/** Look up a model's config, failing closed on an unknown id. */
export function modelConfig(id: string): ModelConfig {
  const cfg = (MODELS as Record<string, ModelConfig>)[id];
  if (!cfg) throw new Error(`Unknown model id: ${id}`);
  return cfg;
}

/** Locked generator tiers (confirmed Phase 2): Sonnet default, Opus heavy. */
export const DEFAULT_GENERATOR = 'claude-sonnet-4-6' satisfies ModelId;
export const HEAVY_GENERATOR = 'claude-opus-4-8' satisfies ModelId;

/** Embed model ids by provider. */
export const VOYAGE_EMBED_MODEL = 'voyage-4' satisfies ModelId;
export const STUB_EMBED_MODEL = 'stub-embed-1024' satisfies ModelId;

/** Embedding width — must match the `chunk.embedding` vector column. */
export const EMBED_DIMENSIONS = 1024;

/**
 * Resolve the embed model to use right now. Real Voyage when its key is present,
 * the deterministic stub otherwise — so the corpus and the query prompt always
 * embed with the same model and stay comparable (invariant #7). Callers stamp
 * the returned id onto the persisted row.
 */
export function activeEmbedModel(): ModelId {
  return process.env.VOYAGE_API_KEY ? VOYAGE_EMBED_MODEL : STUB_EMBED_MODEL;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/** Fail-closed access to provider secrets, mirroring packages/api/src/env.ts. */
export const llmEnv = {
  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),
  voyageApiKey: () => required('VOYAGE_API_KEY'),
};
