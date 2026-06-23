import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';
import { ActionError, type Actions, type ActorContext } from '@phronos/core';
import { authMiddleware, getActor } from './auth.js';

type Env = { Variables: { actor: ActorContext } };

/**
 * The HTTP surface over the action layer. Routes map 1:1 to core verbs; this
 * file holds no business logic — it parses requests, calls a verb, and shapes
 * the response. All write paths therefore go through `core` (invariant #1).
 */
export function createApp(actions: Actions): Hono<Env> {
  const app = new Hono<Env>();

  app.use('*', cors());

  app.get('/healthz', (c) => c.json({ ok: true }));

  // Everything below requires the service token + sets the actor context.
  app.use('/v1/*', authMiddleware);

  // --- Reads ---------------------------------------------------------------
  app.get('/v1/graph', async (c) => {
    const q = c.req.query();
    const filter = {
      ctx: q.ctx,
      phase: q.phase as 'divergent' | 'convergent' | 'operational' | undefined,
      tier: q.tier,
      includeArchived: q.includeArchived === 'true',
    };
    return c.json(await actions.getGraph(filter));
  });

  app.get('/v1/nodes/:id', async (c) => c.json(await actions.getNode(c.req.param('id'))));

  app.get('/v1/annotations', async (c) => {
    const ownerType = c.req.query('ownerType') as 'node' | 'edge' | 'source' | 'output';
    const ownerId = c.req.query('ownerId') ?? '';
    return c.json(await actions.listAnnotations(ownerType, ownerId));
  });

  // --- Graph mutations -----------------------------------------------------
  app.post('/v1/nodes', async (c) => {
    const id = await actions.createNode(getActor(c), await c.req.json());
    return c.json({ id }, 201);
  });

  app.patch('/v1/nodes/:id', async (c) => {
    await actions.updateNode(getActor(c), c.req.param('id'), await c.req.json());
    return c.body(null, 204);
  });

  app.post('/v1/nodes/:id/phase', async (c) => {
    const { phase } = await c.req.json();
    await actions.setPhase(getActor(c), c.req.param('id'), phase);
    return c.body(null, 204);
  });

  app.post('/v1/nodes/:id/archive', async (c) => {
    await actions.archiveNode(getActor(c), c.req.param('id'));
    return c.body(null, 204);
  });

  app.delete('/v1/nodes/:id', async (c) => {
    await actions.deleteNode(getActor(c), c.req.param('id'));
    return c.body(null, 204);
  });

  app.post('/v1/edges', async (c) => {
    const id = await actions.linkEdge(getActor(c), await c.req.json());
    return c.json({ id }, 201);
  });

  app.delete('/v1/edges/:id', async (c) => {
    await actions.unlinkEdge(getActor(c), c.req.param('id'));
    return c.body(null, 204);
  });

  // --- Supernodes ----------------------------------------------------------
  app.post('/v1/supernodes', async (c) => {
    const id = await actions.createSupernode(getActor(c), await c.req.json());
    return c.json({ id }, 201);
  });

  app.post('/v1/supernodes/:id/members', async (c) => {
    const { memberId } = await c.req.json();
    const id = await actions.addToSupernode(getActor(c), c.req.param('id'), memberId);
    return c.json({ id }, 201);
  });

  app.delete('/v1/supernodes/:id/members/:memberId', async (c) => {
    await actions.removeFromSupernode(getActor(c), c.req.param('id'), c.req.param('memberId'));
    return c.body(null, 204);
  });

  // --- Notes & annotations -------------------------------------------------
  app.post('/v1/notes', async (c) => {
    const id = await actions.addNote(getActor(c), await c.req.json());
    return c.json({ id }, 201);
  });

  app.patch('/v1/annotations/:id', async (c) => {
    const { body } = await c.req.json();
    await actions.updateAnnotation(getActor(c), c.req.param('id'), body);
    return c.body(null, 204);
  });

  app.delete('/v1/annotations/:id', async (c) => {
    await actions.deleteAnnotation(getActor(c), c.req.param('id'));
    return c.body(null, 204);
  });

  // --- Error shaping -------------------------------------------------------
  app.onError((err, c) => {
    if (err instanceof ZodError) {
      return c.json({ code: 'validation', message: 'invalid input', issues: err.issues }, 400);
    }
    if (err instanceof ActionError) {
      return c.json({ code: err.code, message: err.message }, err.status as 400);
    }
    console.error(err);
    return c.json({ code: 'internal', message: 'internal error' }, 500);
  });

  return app;
}
