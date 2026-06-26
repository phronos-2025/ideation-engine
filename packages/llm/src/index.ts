/**
 * @phronos/llm — the model router (ADR 0006).
 *
 * Public surface: `embed(modelId, texts)`, `generate(modelId, req)`, and the
 * model registry + helpers for resolving ids and stamping provenance.
 */

export {
  MODELS,
  modelConfig,
  activeEmbedModel,
  llmEnv,
  DEFAULT_GENERATOR,
  HEAVY_GENERATOR,
  VOYAGE_EMBED_MODEL,
  STUB_EMBED_MODEL,
  EMBED_DIMENSIONS,
  type Provider,
  type ModelRole,
  type ModelCost,
  type ModelConfig,
  type ModelId,
} from './config.js';

export { embed } from './embed.js';

export {
  generate,
  type GenerateMessage,
  type GenerateParams,
  type GenerateRequest,
  type GenerateUsage,
  type GenerateResult,
} from './generate.js';
