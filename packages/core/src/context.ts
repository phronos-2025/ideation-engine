/**
 * Who is performing an action. Every mutating verb takes an ActorContext and
 * stamps it onto the one event row it writes. The simulation harness (Phase 3)
 * passes actorType='agent' with a simRunId; the web/API path passes
 * actorType='user' with an actorId derived from the Cloudflare Access JWT.
 */
export interface ActorContext {
  actorType: 'user' | 'agent';
  /** uuid; for users, derived from the CF Access JWT subject. */
  actorId?: string | null;
  /** set when the action runs inside a simulation run. */
  simRunId?: string | null;
  sessionId?: string | null;
}

/** Sentinel actor used by seed/system scripts. */
export const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export const systemContext = (): ActorContext => ({
  actorType: 'user',
  actorId: SYSTEM_ACTOR_ID,
});
