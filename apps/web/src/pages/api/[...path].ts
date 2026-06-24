import type { APIRoute } from 'astro';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const prerender = false;

const API_BASE = import.meta.env.API_BASE_URL ?? 'http://localhost:8080';
const TOKEN = import.meta.env.API_SERVICE_TOKEN ?? 'dev-token';
const FALLBACK_IDENTITY = import.meta.env.ALLOWED_IDENTITY ?? 'local@dev';
// e.g. https://divine-dawn-f85e.cloudflareaccess.com
const TEAM_DOMAIN = import.meta.env.CF_ACCESS_TEAM_DOMAIN;
const AUD = import.meta.env.CF_ACCESS_AUD;

/**
 * When both CF Access values are set (production), every request must carry a
 * valid Cloudflare Access JWT — proving it actually came through the edge gate.
 * This closes the *.vercel.app backdoor: a direct request to the Vercel origin
 * has no valid Access token, so it's rejected (the forwarded x-actor-email
 * header alone is NOT trusted — it's spoofable). Locally (vars unset) we fall
 * back to ALLOWED_IDENTITY. See ADR 0002.
 */
const ACCESS_ENFORCED = Boolean(TEAM_DOMAIN && AUD);
const JWKS = ACCESS_ENFORCED
  ? createRemoteJWKSet(new URL('/cdn-cgi/access/certs', TEAM_DOMAIN))
  : null;

function deny(message: string): Response {
  return new Response(JSON.stringify({ code: 'forbidden', message }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  });
}

/** The authenticated identity, or a 403 Response if Access verification fails. */
async function resolveIdentity(request: Request): Promise<string | Response> {
  if (!ACCESS_ENFORCED) {
    return request.headers.get('cf-access-authenticated-user-email') ?? FALLBACK_IDENTITY;
  }
  const jwt = request.headers.get('cf-access-jwt-assertion');
  if (!jwt) return deny('Cloudflare Access token required');
  try {
    const { payload } = await jwtVerify(jwt, JWKS!, { issuer: TEAM_DOMAIN, audience: AUD });
    const email = (payload.email ?? payload.identity) as string | undefined;
    if (!email) return deny('Access token has no identity');
    return email;
  } catch {
    return deny('invalid Cloudflare Access token');
  }
}

/**
 * Same-origin proxy to the Railway API. Adds the service token (never exposed to
 * the client) and the verified identity. In production the identity comes from a
 * cryptographically verified Access JWT.
 */
const handler: APIRoute = async ({ params, request }) => {
  const identity = await resolveIdentity(request);
  if (identity instanceof Response) return identity;

  const path = params.path ?? '';
  const { search } = new URL(request.url);
  const target = `${API_BASE}/v1/${path}${search}`;

  const headers = new Headers();
  headers.set('x-api-token', TOKEN);
  headers.set('x-actor-email', identity);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const res = await fetch(target, init);
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
};

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
