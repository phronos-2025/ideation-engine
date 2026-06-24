/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Base URL of the Railway API (server-side only). */
  readonly API_BASE_URL?: string;
  /** Shared service token presented to the API (server-side only). */
  readonly API_SERVICE_TOKEN?: string;
  /** Fallback identity for local dev when no CF Access header is present. */
  readonly ALLOWED_IDENTITY?: string;
  /** Cloudflare Access team domain, e.g. https://<team>.cloudflareaccess.com. */
  readonly CF_ACCESS_TEAM_DOMAIN?: string;
  /** Cloudflare Access application AUD tag. Set with TEAM_DOMAIN to enforce the gate. */
  readonly CF_ACCESS_AUD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
