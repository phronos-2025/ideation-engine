/**
 * Browser-side client. Calls the same-origin Astro proxy (`/api/*`), which adds
 * the service token + identity server-side. No secrets here.
 */

export type Phase = 'divergent' | 'convergent' | 'operational';
export type EdgeType = 'parent' | 'cross' | 'contains';

export interface GraphNode {
  id: string;
  label: string;
  tier: string;
  phase: Phase;
  ctx: string | null;
  kind: 'idea' | 'super' | 'vetted';
  body: string | null;
  archived: boolean;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label: string | null;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Annotation {
  id: string;
  ownerType: string;
  ownerId: string;
  kind: string;
  body: string;
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`${method} /api/${path} failed (${res.status}) ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getGraph: () => req<Graph>('GET', 'graph'),
  getNode: (id: string) => req<GraphNode>('GET', `nodes/${id}`),
  createNode: (input: {
    label: string;
    tier: string;
    phase?: Phase;
    ctx?: string | null;
    body?: string | null;
  }) => req<{ id: string }>('POST', 'nodes', input),
  updateNode: (id: string, patch: Record<string, unknown>) =>
    req<void>('PATCH', `nodes/${id}`, patch),
  setPhase: (id: string, phase: Phase) => req<void>('POST', `nodes/${id}/phase`, { phase }),
  archiveNode: (id: string) => req<void>('POST', `nodes/${id}/archive`),
  linkEdge: (input: { sourceId: string; targetId: string; type: EdgeType; label?: string }) =>
    req<{ id: string }>('POST', 'edges', input),
  createSupernode: (input: { label: string; memberIds: string[]; ctx?: string | null }) =>
    req<{ id: string }>('POST', 'supernodes', input),
  addNote: (input: { ownerType: 'node'; ownerId: string; body: string }) =>
    req<{ id: string }>('POST', 'notes', input),
  listAnnotations: (ownerType: string, ownerId: string) =>
    req<Annotation[]>('GET', `annotations?ownerType=${ownerType}&ownerId=${ownerId}`),
};
