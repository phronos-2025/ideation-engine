import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphEdge, GraphNode, Phase } from '../lib/api';
import { GraphModel, PHASE_LABEL } from '../lib/graph';

const PHASE_HEX: Record<Phase, string> = {
  divergent: '#6e81dc',
  convergent: '#cf9a3e',
  operational: '#3e8e6b',
};
const TIER_R: Record<string, number> = {
  life_track: 26,
  realm: 20,
  network: 16,
  initiative: 12,
  goal: 8,
  super: 22,
};
const radius = (tier: string) => TIER_R[tier] ?? 9;

type SimNode = GraphNode & d3.SimulationNodeDatum;
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: GraphEdge['type'];
}
const asNode = (e: string | SimNode): SimNode => e as SimNode;

interface Props {
  model: GraphModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function GraphView({ model, selectedId, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const dragRef = useRef<SimNode | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [, setTick] = useState(0);
  const [phaseFilter, setPhaseFilter] = useState<Phase | null>(null);

  // Build/refresh the simulation whenever the model identity changes.
  useEffect(() => {
    const prevPos = new Map(nodesRef.current.map((n) => [n.id, { x: n.x, y: n.y }]));
    const simNodes: SimNode[] = model.nodes.map((n) => {
      const p = prevPos.get(n.id);
      return { ...n, x: p?.x ?? dims.w / 2 + (Math.random() - 0.5) * 200, y: p?.y ?? dims.h / 2 + (Math.random() - 0.5) * 200 } as SimNode;
    });
    const byId = new Map(simNodes.map((n) => [n.id, n]));
    const links: SimLink[] = model.edges
      .filter((e) => byId.has(e.sourceId) && byId.has(e.targetId))
      .map((e) => ({ id: e.id, type: e.type, source: e.sourceId, target: e.targetId }));
    nodesRef.current = simNodes;
    linksRef.current = links;

    const sim = d3
      .forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((l) => (l.type === 'cross' ? 120 : l.type === 'contains' ? 90 : 64))
          .strength((l) => (l.type === 'parent' ? 0.4 : 0.06)),
      )
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => -90 - radius(d.tier) * 4))
      .force('center', d3.forceCenter(dims.w / 2, dims.h / 2))
      .force('collide', d3.forceCollide<SimNode>((d) => radius(d.tier) + 5))
      .alphaDecay(0.02)
      .on('tick', () => setTick((t) => t + 1));
    simRef.current = sim;
    return () => void sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.force('center', d3.forceCenter(dims.w / 2, dims.h / 2));
    sim.alpha(0.3).restart();
  }, [dims]);

  const onPointerDown = useCallback((e: React.PointerEvent, node: SimNode) => {
    e.stopPropagation();
    dragRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    simRef.current?.alphaTarget(0.3).restart();
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    dragRef.current.fx = e.clientX - rect.left;
    dragRef.current.fy = e.clientY - rect.top;
  }, []);
  const onPointerUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.fx = null;
      dragRef.current.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
  }, []);

  const nodes = nodesRef.current;
  const links = linksRef.current;
  const visible = phaseFilter ? nodes.filter((n) => n.phase === phaseFilter || n.tier === 'life_track') : nodes;
  const visibleIds = new Set(visible.map((n) => n.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--night-0)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--space-3) var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-h3)', color: 'var(--starlight)' }}>Constellation</h1>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 4, background: 'var(--night-2)', borderRadius: 'var(--radius-pill)', padding: 3 }}>
          {([null, 'divergent', 'convergent', 'operational'] as const).map((p) => {
            const active = phaseFilter === p;
            return (
              <button
                key={p ?? 'all'}
                onClick={() => setPhaseFilter(p)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-pill)',
                  padding: '4px 12px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-medium)',
                  background: active ? 'var(--night-4)' : 'transparent',
                  color: active ? 'var(--starlight)' : 'var(--starlight-2)',
                }}
              >
                {p ? PHASE_LABEL[p] : 'All'}
              </button>
            );
          })}
        </div>
      </div>
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'default' }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {links.map((l) => {
            const s = asNode(l.source);
            const t = asNode(l.target);
            if (typeof s !== 'object' || typeof t !== 'object') return null;
            if (!visibleIds.has(s.id) || !visibleIds.has(t.id)) return null;
            const hi = selectedId === s.id || selectedId === t.id;
            const stroke =
              l.type === 'cross' ? '#cf9a3e' : l.type === 'contains' ? '#8c92e0' : '#3a4151';
            return (
              <line
                key={l.id}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={stroke}
                strokeWidth={hi ? 1.6 : 0.8}
                strokeDasharray={l.type === 'parent' ? undefined : '4 4'}
                opacity={hi ? 0.9 : l.type === 'parent' ? 0.5 : 0.35}
              />
            );
          })}
          {visible.map((n) => {
            const r = radius(n.tier);
            const hex = PHASE_HEX[n.phase];
            const sel = selectedId === n.id;
            return (
              <g
                key={n.id}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => onPointerDown(e, n)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(n.id);
                }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={`${hex}33`}
                  stroke={n.kind === 'super' ? '#8c92e0' : hex}
                  strokeWidth={sel ? 3 : 1.2}
                  style={sel ? { filter: `drop-shadow(0 0 8px ${hex})` } : undefined}
                />
                {(r > 11 || sel) && (
                  <text
                    x={n.x}
                    y={(n.y ?? 0) + r + 12}
                    textAnchor="middle"
                    fill={sel ? '#edebe3' : '#b6b2a6'}
                    fontSize={n.tier === 'life_track' ? 11 : 9}
                    fontWeight={sel ? 600 : 400}
                    fontFamily="var(--font-sans)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
