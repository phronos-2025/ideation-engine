/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Base URL of the Railway API (server-side only). */
  readonly API_BASE_URL?: string;
  /** Shared service token presented to the API (server-side only). */
  readonly API_SERVICE_TOKEN?: string;
  /** Fallback identity for local dev when no CF Access header is present. */
  readonly ALLOWED_IDENTITY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
