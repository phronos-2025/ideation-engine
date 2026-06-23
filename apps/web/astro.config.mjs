import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// Server output: the front end proxies to the Railway API server-side so the
// API_SERVICE_TOKEN never reaches the browser (ADR 0002). Vercel adapter for
// deploy; `astro dev` runs SSR locally without needing it.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
});
