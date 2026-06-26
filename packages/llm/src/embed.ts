/**
 * Embedding provider — `embed(modelId, texts) → number[][]` (ADR 0006).
 *
 * Two providers:
 *   - `stub`:   deterministic hash → L2-normalized 1024-dim vector. Carries no
 *               semantic signal; it lets the chunking/storage/ANN pipeline be
 *               built and tested before a real provider exists. Same text always
 *               yields the same vector (reproducible runs, stable HNSW tests).
 *   - `voyage`: POSTs the Voyage embeddings API (`voyage-4`, 1024-dim).
 *
 * Provider *selection* lives in `activeEmbedModel()` (config.ts): it returns the
 * stub id when `VOYAGE_API_KEY` is unset, so the system auto-falls-back without
 * `embed()` ever misreporting which model produced a vector.
 */

import { EMBED_DIMENSIONS, llmEnv, modelConfig } from './config.js';

/** Embed a batch of texts with the given model id. Returns one vector per text. */
export async function embed(modelId: string, texts: string[]): Promise<number[][]> {
  const cfg = modelConfig(modelId);
  if (cfg.role !== 'embedder') {
    throw new Error(`Model ${modelId} is not an embedder (role=${cfg.role})`);
  }
  switch (cfg.provider) {
    case 'stub':
      return texts.map(stubVector);
    case 'voyage':
      return voyageEmbed(modelId, texts);
    default:
      throw new Error(`Provider ${cfg.provider} cannot embed`);
  }
}

/** FNV-1a 32-bit hash — stable across runs, platforms, and Node versions. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic unit vector seeded from the full text. */
function stubVector(text: string): number[] {
  const rand = mulberry32(fnv1a(text));
  const v = new Array<number>(EMBED_DIMENSIONS);
  let norm = 0;
  for (let i = 0; i < EMBED_DIMENSIONS; i++) {
    // Center the uniform draw to [-1, 1) so the vector can point any direction.
    const x = rand() * 2 - 1;
    v[i] = x;
    norm += x * x;
  }
  // L2-normalize so cosine distance (`<=>`) is well-defined. norm is > 0 in
  // practice; guard the degenerate all-zero draw anyway.
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBED_DIMENSIONS; i++) v[i]! /= norm;
  return v;
}

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
}

/** Call the Voyage embeddings API. Fails closed when the key is absent. */
async function voyageEmbed(modelId: string, texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${llmEnv.voyageApiKey()}`,
    },
    body: JSON.stringify({
      model: modelId,
      input: texts,
      output_dimension: EMBED_DIMENSIONS,
    }),
  });
  if (!res.ok) {
    throw new Error(`Voyage API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as VoyageResponse;
  // Voyage echoes a per-item `index`; order by it so output aligns with `texts`.
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
