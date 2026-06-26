import { describe, expect, it } from 'vitest';
import { embed } from './embed.js';
import { EMBED_DIMENSIONS, STUB_EMBED_MODEL } from './config.js';

describe('stub embedder', () => {
  it('returns one 1024-dim vector per input', async () => {
    const [v] = await embed(STUB_EMBED_MODEL, ['hello world']);
    expect(v).toHaveLength(EMBED_DIMENSIONS);
  });

  it('is deterministic for the same text', async () => {
    const [a] = await embed(STUB_EMBED_MODEL, ['reproducible']);
    const [b] = await embed(STUB_EMBED_MODEL, ['reproducible']);
    expect(a).toEqual(b);
  });

  it('produces distinct vectors for distinct text', async () => {
    const [a] = await embed(STUB_EMBED_MODEL, ['alpha']);
    const [b] = await embed(STUB_EMBED_MODEL, ['beta']);
    expect(a).not.toEqual(b);
  });

  it('returns L2-normalized vectors (unit length)', async () => {
    const [v] = await embed(STUB_EMBED_MODEL, ['unit length check']);
    const norm = Math.sqrt(v!.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 10);
  });

  it('preserves batch order', async () => {
    const texts = ['one', 'two', 'three'];
    const batch = await embed(STUB_EMBED_MODEL, texts);
    const singles = await Promise.all(texts.map(async (t) => (await embed(STUB_EMBED_MODEL, [t]))[0]));
    expect(batch).toEqual(singles);
  });

  it('rejects a non-embedder model id', async () => {
    await expect(embed('claude-opus-4-8', ['x'])).rejects.toThrow(/not an embedder/);
  });
});
