/** Centralized, fail-closed environment access for the API service. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  databaseUrl: () => required('DATABASE_URL'),
  /** Shared secret the Vercel front end presents (Vercel <-> Railway trust). */
  apiServiceToken: () => required('API_SERVICE_TOKEN'),
  port: () => Number(process.env.PORT ?? 8080),
  /** Fallback identity for local dev when no CF Access proxy sets x-actor-email. */
  allowedIdentity: () => process.env.ALLOWED_IDENTITY ?? 'local@dev',
};
