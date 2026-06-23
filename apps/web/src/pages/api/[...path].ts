import type { APIRoute } from 'astro';

export const prerender = false;

const API_BASE = import.meta.env.API_BASE_URL ?? 'http://localhost:8080';
const TOKEN = import.meta.env.API_SERVICE_TOKEN ?? 'dev-token';
const FALLBACK_IDENTITY = import.meta.env.ALLOWED_IDENTITY ?? 'local@dev';

/**
 * Same-origin proxy: the browser calls `/api/<verb>`; we forward to the Railway
 * API's `/v1/<verb>`, attaching the shared service token (never exposed to the
 * client) and the authenticated identity. In production Cloudflare Access sets
 * `Cf-Access-Authenticated-User-Email`; locally we fall back to ALLOWED_IDENTITY.
 */
const handler: APIRoute = async ({ params, request }) => {
  const path = params.path ?? '';
  const { search } = new URL(request.url);
  const target = `${API_BASE}/v1/${path}${search}`;

  const headers = new Headers();
  headers.set('x-api-token', TOKEN);
  headers.set(
    'x-actor-email',
    request.headers.get('cf-access-authenticated-user-email') ?? FALLBACK_IDENTITY,
  );
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
