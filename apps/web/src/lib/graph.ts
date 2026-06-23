import type { Graph, GraphEdge, GraphNode } from './api';

/** Indexed view of the graph for O(1) relationship lookups. */
export class GraphModel {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  private byId = new Map<string, GraphNode>();
  // adjacency by edge type
  private parentChildren = new Map<string, string[]>(); // parent -> children
  private childParents = new Map<string, string[]>(); // child -> parents
  private superMembers = new Map<string, string[]>(); // super -> members
  private memberSupers = new Map<string, string[]>(); // member -> supers
  private crossAdj = new Map<string, string[]>(); // node -> cross-linked nodes

  constructor(graph: Graph) {
    this.nodes = graph.nodes;
    this.edges = graph.edges;
    for (const n of graph.nodes) this.byId.set(n.id, n);
    const push = (m: Map<string, string[]>, k: string, v: string) => {
      const a = m.get(k);
      if (a) a.push(v);
      else m.set(k, [v]);
    };
    for (const e of graph.edges) {
      if (!this.byId.has(e.sourceId) || !this.byId.has(e.targetId)) continue;
      if (e.type === 'parent') {
        push(this.parentChildren, e.sourceId, e.targetId);
        push(this.childParents, e.targetId, e.sourceId);
      } else if (e.type === 'contains') {
        push(this.superMembers, e.sourceId, e.targetId);
        push(this.memberSupers, e.targetId, e.sourceId);
      } else if (e.type === 'cross') {
        push(this.crossAdj, e.sourceId, e.targetId);
        push(this.crossAdj, e.targetId, e.sourceId);
      }
    }
  }

  get(id: string): GraphNode | undefined {
    return this.byId.get(id);
  }
  private resolve(ids: string[] | undefined): GraphNode[] {
    return (ids ?? []).map((id) => this.byId.get(id)).filter((n): n is GraphNode => !!n);
  }

  children(id: string): GraphNode[] {
    return this.resolve(this.parentChildren.get(id));
  }
  parents(id: string): GraphNode[] {
    return this.resolve(this.childParents.get(id));
  }
  /** Members of a supernode (its `contains` targets). */
  members(id: string): GraphNode[] {
    return this.resolve(this.superMembers.get(id));
  }
  /** Supernodes this node belongs to (incoming `contains`). */
  belongsTo(id: string): GraphNode[] {
    return this.resolve(this.memberSupers.get(id));
  }
  crossLinks(id: string): GraphNode[] {
    return this.resolve(this.crossAdj.get(id));
  }

  /** Top-level nodes of the parent hierarchy (no incoming parent edge), excluding supernodes. */
  roots(): GraphNode[] {
    return this.nodes
      .filter((n) => n.kind !== 'super' && !this.childParents.has(n.id))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  supernodes(): GraphNode[] {
    return this.nodes.filter((n) => n.kind === 'super');
  }

  /** Count of all descendants via parent edges (for group badges). */
  descendantCount(id: string): number {
    let count = 0;
    const stack = [...(this.parentChildren.get(id) ?? [])];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      count++;
      const kids = this.parentChildren.get(cur);
      if (kids) stack.push(...kids);
    }
    return count;
  }
}

export type Phase = GraphNode['phase'];

export const PHASE_LABEL: Record<Phase, string> = {
  divergent: 'Divergent',
  convergent: 'Convergent',
  operational: 'Operational',
};

/** Phase → design-kit color vars (dot/icon color + soft tint background). */
export const PHASE_VARS: Record<Phase, { solid: string; soft: string; deep: string }> = {
  divergent: { solid: 'var(--divergent-2)', soft: 'var(--divergent-0)', deep: 'var(--divergent-3)' },
  convergent: { solid: 'var(--convergent-2)', soft: 'var(--convergent-0)', deep: 'var(--convergent-3)' },
  operational: {
    solid: 'var(--operational-2)',
    soft: 'var(--operational-0)',
    deep: 'var(--operational-3)',
  },
};
