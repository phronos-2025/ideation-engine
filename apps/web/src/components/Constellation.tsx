import { useCallback, useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { api, type Annotation, type GraphEdge, type GraphNode, type Phase } from '../lib/api';

const TIERS: Record<string, { r: number; z: number }> = {
  life_track: { r: 30, z: 0 },
  realm: { r: 22, z: 1 },
  network: { r: 17, z: 2 },
  initiative: { r: 12, z: 3 },
  goal: { r: 7, z: 4 },
  super: { r: 24, z: 0 },
};

const PHASE: Record<Phase, { color: string; bg: string; label: string }> = {
  divergent: { color: '#5BC0F8', bg: '#1a3a5c', label: 'Divergent' },
  convergent: { color: '#F5C542', bg: '#4a3a1a', label: 'Convergent' },
  operational: { color: '#4CAF7D', bg: '#1a3a2a', label: 'Operational' },
};

const CTX_COLORS: Record<string, string> = {
  stanford: '#B83A3A',
  phronos: '#7B68EE',
  syndromic: '#26A69A',
  personal: '#E91E63',
};

type SimNode = GraphNode & d3.SimulationNodeDatum;
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  type: GraphEdge['type'];
}

const radius = (tier: string) => TIERS[tier]?.r ?? 8;
const endId = (e: string | SimNode): string => (typeof e === 'object' ? e.id : e);

export default function Constellation() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const dragRef = useRef<SimNode | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const [dims, setDims] = useState({ w: 900, h: 600 });
  const [, setTick] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [multi, setMulti] = useState<Set<string>>(new Set());
  const [filterCtx, setFilterCtx] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTier, setNewTier] = useState('goal');
  const [newPhase, setNewPhase] = useState<Phase>('divergent');
  const [error, setError] = useState<string | null>(null);

  const rerender = () => setTick((t) => t + 1);

  /** Fetch the graph and reconcile into the live D3 simulation, preserving positions. */
  const loadGraph = useCallback(async () => {
    try {
      const graph = await api.getGraph();
      const prev = posRef.current;
      const simNodes: SimNode[] = graph.nodes.map((n) => {
        const p = prev.get(n.id);
        return { ...n, x: p?.x, y: p?.y } as SimNode;
      });
      const byId = new Map(simNodes.map((n) => [n.id, n]));
      const links: SimLink[] = graph.edges
        .filter((e) => byId.has(e.sourceId) && byId.has(e.targetId))
        .map((e) => ({ id: e.id, type: e.type, source: e.sourceId, target: e.targetId }));

      nodesRef.current = simNodes;
      linksRef.current = links;

      const sim = simRef.current;
      if (sim) {
        sim.nodes(simNodes);
        sim.force(
          'link',
          d3
            .forceLink<SimNode, SimLink>(links)
            .id((d) => d.id)
            .distance((l) => (l.type === 'cross' ? 120 : l.type === 'contains' ? 90 : 60))
            .strength((l) => (l.type === 'parent' ? 0.4 : 0.05)),
        );
        sim.force('collide', d3.forceCollide<SimNode>((d) => radius(d.tier) + 4));
        sim.alpha(0.6).restart();
      }
      rerender();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Initialize the simulation once.
  useEffect(() => {
    const sim = d3
      .forceSimulation<SimNode, SimLink>([])
      .force('charge', d3.forceManyBody<SimNode>().strength((d) => -80 - radius(d.tier) * 4))
      .force('center', d3.forceCenter(dims.w / 2, dims.h / 2))
      .force('x', d3.forceX(dims.w / 2).strength(0.03))
      .force('y', d3.forceY(dims.h / 2).strength(0.03))
      .alphaDecay(0.015)
      .on('tick', () => {
        for (const n of nodesRef.current) {
          if (n.x != null && n.y != null) posRef.current.set(n.id, { x: n.x, y: n.y });
        }
        rerender();
      });
    simRef.current = sim;
    void loadGraph();
    return () => void sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter on resize.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    sim.force('center', d3.forceCenter(dims.w / 2, dims.h / 2));
    sim.force('x', d3.forceX(dims.w / 2).strength(0.03));
    sim.force('y', d3.forceY(dims.h / 2).strength(0.03));
    sim.alpha(0.3).restart();
  }, [dims]);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Load notes when the selected node changes.
  useEffect(() => {
    if (!selected) {
      setNotes([]);
      return;
    }
    void api
      .listAnnotations('node', selected)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [selected]);

  // --- drag ---------------------------------------------------------------
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

  // --- mutations (all through the API) ------------------------------------
  const changePhase = async (id: string, phase: Phase) => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (n) {
      n.phase = phase;
      rerender();
    }
    try {
      await api.setPhase(id, phase);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await loadGraph();
    }
  };

  const addChild = async (parent: SimNode) => {
    if (!newLabel.trim()) return;
    try {
      const { id } = await api.createNode({
        label: newLabel.trim(),
        tier: newTier,
        phase: newPhase,
        ctx: parent.ctx,
      });
      await api.linkEdge({ sourceId: parent.id, targetId: id, type: 'parent' });
      setNewLabel('');
      setAdding(false);
      await loadGraph();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const addNote = async (nodeId: string) => {
    if (!noteDraft.trim()) return;
    try {
      await api.addNote({ ownerType: 'node', ownerId: nodeId, body: noteDraft.trim() });
      setNoteDraft('');
      setNotes(await api.listAnnotations('node', nodeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const makeSupernode = async () => {
    const memberIds = [...multi];
    if (memberIds.length < 2) return;
    const label = window.prompt('Supernode label?', 'New cluster');
    if (!label) return;
    try {
      await api.createSupernode({ label, memberIds });
      setMulti(new Set());
      await loadGraph();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const toggleMulti = (id: string) => {
    setMulti((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- derived ------------------------------------------------------------
  const nodes = nodesRef.current;
  const links = linksRef.current;
  const visible = filterCtx
    ? nodes.filter((n) => !n.ctx || n.ctx === filterCtx || n.tier === 'life_track')
    : nodes;
  const visibleIds = new Set(visible.map((n) => n.id));
  const selNode = selected ? nodes.find((n) => n.id === selected) : null;
  const connectedCross = selNode
    ? links.filter(
        (l) =>
          l.type === 'cross' &&
          (endId(l.source as string | SimNode) === selNode.id ||
            endId(l.target as string | SimNode) === selNode.id),
      )
    : [];

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#080C18',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#c8d0e0',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          borderBottom: '1px solid #1a2040',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e0e6f0',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Phronos · Phase Constellation
        </span>
        <div style={{ flex: 1 }} />
        {multi.size > 1 && (
          <button
            onClick={makeSupernode}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid #7B68EE',
              background: '#7B68EE20',
              color: '#b8a8ff',
              cursor: 'pointer',
            }}
          >
            ⬡ New supernode ({multi.size})
          </button>
        )}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: '#6b7394' }}>Filter:</span>
          <button onClick={() => setFilterCtx(null)} style={pill(null, filterCtx === null)}>
            All
          </button>
          {Object.entries(CTX_COLORS).map(([k, c]) => (
            <button key={k} onClick={() => setFilterCtx(k)} style={pill(c, filterCtx === k)}>
              {k}
            </button>
          ))}
        </div>
        <div
          style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 10, color: '#4a5278' }}
        >
          {Object.entries(PHASE).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: v.color,
                  boxShadow: `0 0 6px ${v.color}60`,
                }}
              />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '6px 16px', background: '#3a1a1a', color: '#f5a0a0', fontSize: 11 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8 }}>dismiss</button>
        </div>
      )}

      <div
        style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}
        ref={containerRef}
      >
        <svg
          ref={svgRef}
          width={dims.w}
          height={dims.h}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: dragRef.current ? 'grabbing' : 'default',
            touchAction: 'none',
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => {
            if (!dragRef.current) setSelected(null);
          }}
        >
          {/* parent + contains links */}
          {links
            .filter((l) => l.type !== 'cross')
            .map((l) => {
              const s = l.source as SimNode;
              const t = l.target as SimNode;
              if (typeof s !== 'object' || typeof t !== 'object') return null;
              if (!visibleIds.has(s.id) || !visibleIds.has(t.id)) return null;
              const hi = selNode && (s.id === selNode.id || t.id === selNode.id);
              const contains = l.type === 'contains';
              return (
                <line
                  key={l.id}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={contains ? '#7B68EE80' : hi ? '#3a4a70' : '#141a30'}
                  strokeWidth={hi ? 1.5 : 0.8}
                  strokeDasharray={contains ? '2 3' : undefined}
                  opacity={hi ? 0.8 : 0.5}
                />
              );
            })}
          {/* cross links */}
          {links
            .filter((l) => l.type === 'cross')
            .map((l) => {
              const s = l.source as SimNode;
              const t = l.target as SimNode;
              if (typeof s !== 'object' || typeof t !== 'object') return null;
              if (!visibleIds.has(s.id) || !visibleIds.has(t.id)) return null;
              const hi = selNode && (s.id === selNode.id || t.id === selNode.id);
              return (
                <line
                  key={l.id}
                  x1={s.x}
                  y1={s.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={hi ? '#F5C54280' : '#F5C54220'}
                  strokeWidth={hi ? 1.5 : 0.8}
                  strokeDasharray="4 4"
                  opacity={hi ? 0.9 : 0.3}
                />
              );
            })}
          {/* nodes */}
          {visible.map((n) => {
            const r = radius(n.tier);
            const pc = PHASE[n.phase];
            const isSel = selNode?.id === n.id;
            const inMulti = multi.has(n.id);
            return (
              <g
                key={n.id}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => onPointerDown(e, n)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.shiftKey) toggleMulti(n.id);
                  else {
                    setSelected(n.id);
                    setAdding(false);
                  }
                }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r}
                  fill={pc.bg}
                  stroke={n.kind === 'super' ? '#b8a8ff' : pc.color}
                  strokeWidth={isSel ? 2.5 : inMulti ? 2 : 0.8}
                />
                {n.ctx && CTX_COLORS[n.ctx] && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r + 3}
                    fill="none"
                    stroke={CTX_COLORS[n.ctx]}
                    strokeWidth={1.2}
                    opacity={0.4}
                    strokeDasharray={n.tier === 'life_track' ? undefined : '2 3'}
                  />
                )}
                {inMulti && (
                  <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke="#7B68EE" strokeWidth={1} />
                )}
                {(r > 10 || hovered === n.id || isSel) && (
                  <text
                    x={n.x}
                    y={(n.y ?? 0) + r + 12}
                    textAnchor="middle"
                    fill={isSel ? '#e0e6f0' : '#6b7394'}
                    fontSize={n.tier === 'life_track' ? 11 : n.tier === 'goal' ? 8 : 9}
                    fontWeight={isSel ? 600 : 400}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {n.label.length > 22 ? n.label.slice(0, 20) + '…' : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Detail panel */}
        {selNode && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: 300,
              maxWidth: '85vw',
              background: '#0d1225ee',
              borderLeft: '1px solid #1a2040',
              padding: 16,
              overflowY: 'auto',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#6b7394',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {selNode.kind === 'super' ? 'Supernode' : selNode.tier.replace('_', ' ')}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e6f0', marginTop: 2 }}>
                  {selNode.label}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7394',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            {/* Phase */}
            <div>
              <div style={{ fontSize: 10, color: '#6b7394', marginBottom: 6, textTransform: 'uppercase' }}>
                Phase
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(Object.keys(PHASE) as Phase[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => changePhase(selNode.id, k)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      fontSize: 10,
                      border: `1px solid ${selNode.phase === k ? PHASE[k].color : '#1a2040'}`,
                      borderRadius: 4,
                      background: selNode.phase === k ? PHASE[k].bg : 'transparent',
                      color: selNode.phase === k ? PHASE[k].color : '#4a5278',
                      cursor: 'pointer',
                      fontWeight: selNode.phase === k ? 600 : 400,
                    }}
                  >
                    {PHASE[k].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cross-connections */}
            {connectedCross.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: '#F5C542', marginBottom: 6, textTransform: 'uppercase' }}>
                  Cross-connections
                </div>
                {connectedCross.map((l) => {
                  const other =
                    endId(l.source as string | SimNode) === selNode.id
                      ? endId(l.target as string | SimNode)
                      : endId(l.source as string | SimNode);
                  const on = nodes.find((n) => n.id === other);
                  return on ? (
                    <div
                      key={l.id}
                      onClick={() => setSelected(on.id)}
                      style={{
                        display: 'flex',
                        gap: 6,
                        padding: '4px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        background: '#1a1a10',
                        border: '1px solid #2a2a1a',
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#F5C542' }}>↔</span>
                      <span style={{ fontSize: 11, color: '#c0b060' }}>{on.label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Notes */}
            <div>
              <div style={{ fontSize: 10, color: '#6b7394', marginBottom: 6, textTransform: 'uppercase' }}>
                Notes ({notes.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {notes.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      fontSize: 11,
                      color: '#8892b0',
                      background: '#0a0e1a',
                      border: '1px solid #141a30',
                      borderRadius: 4,
                      padding: '6px 8px',
                    }}
                  >
                    {a.body}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note…"
                  onKeyDown={(e) => e.key === 'Enter' && addNote(selNode.id)}
                  style={{
                    flex: 1,
                    background: '#0a0e1a',
                    border: '1px solid #1a2040',
                    borderRadius: 4,
                    padding: '6px 8px',
                    color: '#c8d0e0',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={() => addNote(selNode.id)}
                  style={{
                    padding: '6px 10px',
                    background: '#1a2a50',
                    border: 'none',
                    borderRadius: 4,
                    color: '#5BC0F8',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Add child */}
            <div style={{ borderTop: '1px solid #1a2040', paddingTop: 12 }}>
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    fontSize: 11,
                    background: 'transparent',
                    border: '1px dashed #2a3460',
                    borderRadius: 4,
                    color: '#5a6a90',
                    cursor: 'pointer',
                  }}
                >
                  + Add child node
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Label…"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && addChild(selNode)}
                    style={{
                      background: '#0a0e1a',
                      border: '1px solid #1a2040',
                      borderRadius: 4,
                      padding: '6px 8px',
                      color: '#c8d0e0',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select
                      value={newTier}
                      onChange={(e) => setNewTier(e.target.value)}
                      style={selStyle}
                    >
                      {Object.keys(TIERS)
                        .filter((t) => t !== 'super')
                        .map((t) => (
                          <option key={t} value={t}>
                            {t.replace('_', ' ')}
                          </option>
                        ))}
                    </select>
                    <select
                      value={newPhase}
                      onChange={(e) => setNewPhase(e.target.value as Phase)}
                      style={selStyle}
                    >
                      {(Object.keys(PHASE) as Phase[]).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => addChild(selNode)}
                      style={{
                        flex: 1,
                        padding: 6,
                        background: '#1a2a50',
                        border: 'none',
                        borderRadius: 4,
                        color: '#5BC0F8',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAdding(false)}
                      style={{
                        flex: 1,
                        padding: 6,
                        background: '#1a1a20',
                        border: 'none',
                        borderRadius: 4,
                        color: '#6b7394',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 'auto', fontSize: 9, color: '#3a4268', lineHeight: 1.5 }}>
              Drag to reposition · Click to inspect · Shift-click to multi-select, then make a
              supernode · Changes persist to the database
            </div>
          </div>
        )}

        {/* Tier legend */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            fontSize: 9,
            color: '#3a4268',
          }}
        >
          {Object.entries(TIERS)
            .filter(([k]) => k !== 'super')
            .map(([k, v]) => (
              <div
                key={k}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
              >
                <div
                  style={{
                    width: v.r * 1.2,
                    height: v.r * 1.2,
                    borderRadius: '50%',
                    border: '1px solid #1a2040',
                  }}
                />
                <span>{k.replace('_', ' ')}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

const selStyle: React.CSSProperties = {
  flex: 1,
  background: '#0a0e1a',
  border: '1px solid #1a2040',
  borderRadius: 4,
  padding: 4,
  color: '#8892b0',
  fontSize: 10,
};

function pill(color: string | null, active: boolean): React.CSSProperties {
  return {
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 10,
    cursor: 'pointer',
    border: `1px solid ${active ? color ?? '#5BC0F8' : '#1a2040'}`,
    background: active ? (color ? color + '20' : '#1a2a50') : 'transparent',
    color: active ? color ?? '#5BC0F8' : '#4a5278',
    textTransform: 'capitalize',
    fontWeight: active ? 600 : 400,
  };
}
