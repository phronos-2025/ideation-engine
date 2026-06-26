/**
 * Generation provider — `generate(modelId, { system, messages, params }) →
 * { text, usage }` (ADR 0006). Provider `anthropic`, real Claude via the
 * Messages API.
 *
 * Request shape confirmed against the claude-api skill:
 *   - Adaptive thinking by default (`thinking: { type: 'adaptive' }`) — Claude
 *     decides depth per request; disable per call via `params.thinking = false`.
 *   - No `temperature` / `top_p` — both are rejected (400) on Opus 4.8 / Sonnet
 *     4.6; we steer via prompting only.
 *   - Streaming + `finalMessage()` so large outputs don't hit HTTP timeouts.
 */

import Anthropic from '@anthropic-ai/sdk';
import { llmEnv, modelConfig } from './config.js';

export interface GenerateMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerateParams {
  /** Output ceiling. Defaults to a safe 16K, clamped to the model's cap. */
  maxTokens?: number;
  /** Adaptive extended thinking. Defaults to on. */
  thinking?: boolean;
}

export interface GenerateRequest {
  system?: string;
  messages: GenerateMessage[];
  params?: GenerateParams;
}

export interface GenerateUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateResult {
  /** Concatenated text blocks (empty on a `refusal` stop). */
  text: string;
  usage: GenerateUsage;
  /** The model that actually served the response. */
  model: string;
  stopReason: string | null;
}

let client: Anthropic | undefined;

/** Lazy singleton — built on first use so importing the package never needs a key. */
function anthropic(): Anthropic {
  return (client ??= new Anthropic({ apiKey: llmEnv.anthropicApiKey() }));
}

const DEFAULT_MAX_TOKENS = 16000;

/** Generate text with the given Claude model id. */
export async function generate(
  modelId: string,
  req: GenerateRequest,
): Promise<GenerateResult> {
  const cfg = modelConfig(modelId);
  if (cfg.provider !== 'anthropic') {
    throw new Error(`Model ${modelId} is not an Anthropic generator`);
  }

  const maxTokens = Math.min(req.params?.maxTokens ?? DEFAULT_MAX_TOKENS, cfg.cap);
  const stream = anthropic().messages.stream({
    model: modelId,
    max_tokens: maxTokens,
    ...(req.params?.thinking === false ? {} : { thinking: { type: 'adaptive' } }),
    ...(req.system ? { system: req.system } : {}),
    messages: req.messages,
  });

  const message = await stream.finalMessage();
  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return {
    text,
    usage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
    model: message.model,
    stopReason: message.stop_reason,
  };
}
