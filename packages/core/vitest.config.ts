import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Workspace packages export TypeScript source (exports -> ./src/*.ts), so
    // they must be transformed rather than treated as external node modules.
    server: { deps: { inline: [/^@phronos\//] } },
    // Integration tests talk to a real database; run them serially.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
