import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import type { ActorContext } from '@phronos/core';
import { env } from './env.js';

/**
 * Derive a stable uuid for an identity (e.g. the email/subject from the
 * Cloudflare Access JWT). Deterministic v5-style uuid, dependency-free, so the
 * same person always maps to the same event.actor_id.
 */
export function actorIdFromIdentity(identity: string): string {
  const h = createHash('sha1').update(`phronos:${identity.toLowerCase()}`).digest('hex');
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Trust boundary for the always-on Railway service. Cloudflare Access protects
 * the public edge; this gate ensures only the Vercel front end (bearing the
 * shared service token) reaches the API. The forwarded identity header
 * (set by the proxy from the verified CF Access JWT) becomes event.actor_id.
 *
 * Deploy hardening (documented in docs/runbooks): additionally verify the raw
 * Cf-Access-Jwt-Assertion against the team JWKS for defense in depth.
 */
export const authMiddleware: MiddlewareHandler<{ Variables: { actor: ActorContext } }> = async (
  c,
  next,
) => {
  const presented = c.req.header('x-api-token') ?? '';
  if (!safeEqual(presented, env.apiServiceToken())) {
    return c.json({ code: 'unauthorized', message: 'invalid or missing service token' }, 401);
  }
  const identity = c.req.header('x-actor-email') ?? env.allowedIdentity();
  c.set('actor', { actorType: 'user', actorId: actorIdFromIdentity(identity) });
  await next();
};

export function getActor(c: Context<{ Variables: { actor: ActorContext } }>): ActorContext {
  return c.get('actor');
}
