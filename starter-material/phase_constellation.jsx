import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const TIERS = {
  life_track: { r: 30, z: 0 },
  realm: { r: 22, z: 1 },
  network: { r: 17, z: 2 },
  initiative: { r: 12, z: 3 },
  goal: { r: 7, z: 4 },
};

const PHASE = {
  divergent: { color: "#5BC0F8", bg: "#1a3a5c", label: "Divergent" },
  convergent: { color: "#F5C542", bg: "#4a3a1a", label: "Convergent" },
  operational: { color: "#4CAF7D", bg: "#1a3a2a", label: "Operational" },
};

const CTX_COLORS = {
  stanford: "#B83A3A",
  phronos: "#7B68EE",
  syndromic: "#26A69A",
  personal: "#E91E63",
};

const seed = () => {
  let nodes = [
    { id: "pro", label: "Professional", tier: "life_track", phase: "operational", ctx: null, parent: null },
    { id: "per", label: "Personal", tier: "life_track", phase: "divergent", ctx: "personal", parent: null },
    { id: "stanford", label: "Stanford", tier: "realm", phase: "operational", ctx: "stanford", parent: "pro" },
    { id: "phronos", label: "Phronos", tier: "realm", phase: "convergent", ctx: "phronos", parent: "pro" },
    { id: "syndromic", label: "Syndromic", tier: "realm", phase: "convergent", ctx: "syndromic", parent: "pro" },
    { id: "life", label: "Life Admin", tier: "realm", phase: "divergent", ctx: "personal", parent: "per" },
    { id: "lane", label: "Lane Library", tier: "network", phase: "operational", ctx: "stanford", parent: "stanford" },
    { id: "infra", label: "Infrastructure", tier: "initiative", phase: "convergent", ctx: "stanford", parent: "lane" },
    { id: "ops", label: "Operations", tier: "initiative", phase: "operational", ctx: "stanford", parent: "lane" },
    { id: "analytics", label: "Analytics", tier: "initiative", phase: "convergent", ctx: "stanford", parent: "lane" },
    { id: "policy", label: "Policy", tier: "initiative", phase: "operational", ctx: "stanford", parent: "lane" },
    { id: "advocacy", label: "Advocacy", tier: "initiative", phase: "divergent", ctx: "stanford", parent: "lane" },
    { id: "visibility", label: "Institutional Visibility", tier: "initiative", phase: "convergent", ctx: "stanford", parent: "lane" },
    { id: "education", label: "Education", tier: "initiative", phase: "operational", ctx: "stanford", parent: "lane" },
    { id: "space", label: "Space & Presence", tier: "initiative", phase: "divergent", ctx: "stanford", parent: "lane" },
    { id: "rnd", label: "R&D + Scholarship", tier: "initiative", phase: "divergent", ctx: "stanford", parent: "lane" },
    { id: "g_meta", label: "LaneSearch metadata augmentation", tier: "goal", phase: "convergent", ctx: "stanford", parent: "infra" },
    { id: "g_vec", label: "Solr vector search", tier: "goal", phase: "convergent", ctx: "stanford", parent: "infra" },
    { id: "g_api", label: "LaneSearch APIs · agentic", tier: "goal", phase: "convergent", ctx: "stanford", parent: "infra" },
    { id: "g_libmeta", label: "Librarian metadata processes", tier: "goal", phase: "operational", ctx: "stanford", parent: "ops" },
    { id: "g_policies", label: "IT & AI policies", tier: "goal", phase: "operational", ctx: "stanford", parent: "ops" },
    { id: "g_aitools", label: "AI tools for efficiency", tier: "goal", phase: "convergent", ctx: "stanford", parent: "ops" },
    { id: "g_dashboards", label: "Standardize dashboards", tier: "goal", phase: "convergent", ctx: "stanford", parent: "analytics" },
    { id: "g_feedback", label: "User-centric feedback", tier: "goal", phase: "divergent", ctx: "stanford", parent: "analytics" },
    { id: "g_community", label: "Stakeholder community", tier: "goal", phase: "divergent", ctx: "stanford", parent: "analytics" },
    { id: "g_folio", label: "FOLIO AIML group", tier: "goal", phase: "operational", ctx: "stanford", parent: "policy" },
    { id: "g_watch", label: "Watch AI4LAM · Code4lib · CHT", tier: "goal", phase: "operational", ctx: "stanford", parent: "policy" },
    { id: "g_thought", label: "AI/ML thought leadership", tier: "goal", phase: "divergent", ctx: "stanford", parent: "advocacy" },
    { id: "g_funding", label: "Apply for funding", tier: "goal", phase: "convergent", ctx: "stanford", parent: "visibility" },
    { id: "g_literacy_adv", label: "AI literacy advocacy", tier: "goal", phase: "convergent", ctx: "stanford", parent: "visibility" },
    { id: "g_meded", label: "Library in AI in MedEd", tier: "goal", phase: "convergent", ctx: "stanford", parent: "visibility" },
    { id: "g_eps", label: "EPS AI Community of Practice", tier: "goal", phase: "convergent", ctx: "stanford", parent: "visibility" },
    { id: "g_hai", label: "HAI seminars", tier: "goal", phase: "operational", ctx: "stanford", parent: "visibility" },
    { id: "g_twin", label: "Digital Twin Lab", tier: "goal", phase: "divergent", ctx: "stanford", parent: "education" },
    { id: "g_agentlab", label: "Agentic workflow labs", tier: "goal", phase: "convergent", ctx: "stanford", parent: "education" },
    { id: "g_littools", label: "AI Literacy tools & classes", tier: "goal", phase: "operational", ctx: "stanford", parent: "education" },
    { id: "g_cisl", label: "CISL simulations", tier: "goal", phase: "convergent", ctx: "stanford", parent: "education" },
    { id: "g_augskills", label: "AI-augmented class skills", tier: "goal", phase: "operational", ctx: "stanford", parent: "education" },
    { id: "g_align", label: "Class alignment w/ institutes", tier: "goal", phase: "divergent", ctx: "stanford", parent: "education" },
    { id: "g_archive", label: "Historical archive engagement", tier: "goal", phase: "divergent", ctx: "stanford", parent: "space" },
    { id: "g_maker", label: "AI maker labs · physical space", tier: "goal", phase: "divergent", ctx: "stanford", parent: "space" },
    { id: "g_kpe", label: "Knowledge Provenance Engine", tier: "goal", phase: "divergent", ctx: "stanford", parent: "rnd" },
  ];
  const crossLinks = [
    { source: "g_api", target: "g_agentlab", type: "cross" },
    { source: "g_literacy_adv", target: "g_littools", type: "cross" },
    { source: "g_kpe", target: "g_meta", type: "cross" },
    { source: "g_twin", target: "g_cisl", type: "cross" },
    { source: "g_maker", target: "g_twin", type: "cross" },
    { source: "g_thought", target: "g_kpe", type: "cross" },
  ];
  return { nodes, crossLinks };
};

export default function PhaseConstellation() {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const dragRef = useRef(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 900, h: 600 });
  const [tick, setTick] = useState(0);
  const nodesRef = useRef(null);
  const linksRef = useRef(null);
  const crossRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTier, setNewTier] = useState("goal");
  const [newPhase, setNewPhase] = useState("divergent");
  const [filterCtx, setFilterCtx] = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const { nodes, crossLinks } = seed();
    nodesRef.current = nodes;
    const parentLinks = nodes.filter(n => n.parent).map(n => ({
      source: n.parent, target: n.id, type: "parent"
    }));
    linksRef.current = parentLinks;
    crossRef.current = crossLinks;
    const allLinks = [...parentLinks, ...crossLinks];

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(allLinks).id(d => d.id).distance(d =>
        d.type === "cross" ? 120 : 60 + (TIERS[nodes.find(n => n.id === (d.source.id || d.source))?.tier]?.r || 10) * 2
      ).strength(d => d.type === "cross" ? 0.05 : 0.4))
      .force("charge", d3.forceManyBody().strength(d => -80 - TIERS[d.tier].r * 4))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", d3.forceCollide(d => TIERS[d.tier].r + 4))
      .force("x", d3.forceX(dims.w / 2).strength(0.03))
      .force("y", d3.forceY(dims.h / 2).strength(0.03))
      .alphaDecay(0.01)
      .on("tick", () => setTick(t => t + 1));

    simRef.current = sim;
    return () => sim.stop();
  }, []);

  useEffect(() => {
    if (!simRef.current) return;
    simRef.current.force("center", d3.forceCenter(dims.w / 2, dims.h / 2));
    simRef.current.force("x", d3.forceX(dims.w / 2).strength(0.03));
    simRef.current.force("y", d3.forceY(dims.h / 2).strength(0.03));
    simRef.current.alpha(0.3).restart();
  }, [dims]);

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleMouseDown = useCallback((e, node) => {
    e.stopPropagation();
    dragRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    simRef.current?.alphaTarget(0.3).restart();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragRef.current.fx = x;
    dragRef.current.fy = y;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      dragRef.current.fx = null;
      dragRef.current.fy = null;
      dragRef.current = null;
      simRef.current?.alphaTarget(0);
    }
  }, []);

  const handleTouchStart = useCallback((e, node) => {
    e.stopPropagation();
    dragRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    simRef.current?.alphaTarget(0.3).restart();
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragRef.current || !svgRef.current) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    dragRef.current.fx = touch.clientX - rect.left;
    dragRef.current.fy = touch.clientY - rect.top;
  }, []);

  const changePhase = (nodeId, newPhase) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (node) { node.phase = newPhase; setTick(t => t + 1); }
  };

  const addNode = () => {
    if (!newLabel.trim() || !selected) return;
    const id = "n_" + Date.now();
    const node = {
      id, label: newLabel.trim(), tier: newTier, phase: newPhase,
      ctx: selected.ctx, parent: selected.id,
      x: selected.x + (Math.random() - 0.5) * 60,
      y: selected.y + (Math.random() - 0.5) * 60,
    };
    nodesRef.current.push(node);
    const link = { source: selected.id, target: id, type: "parent" };
    linksRef.current.push(link);

    const allLinks = [...linksRef.current, ...crossRef.current];
    simRef.current.nodes(nodesRef.current);
    simRef.current.force("link", d3.forceLink(allLinks).id(d => d.id).distance(60).strength(d => d.type === "cross" ? 0.05 : 0.4));
    simRef.current.force("collide", d3.forceCollide(d => TIERS[d.tier]?.r + 4 || 10));
    simRef.current.alpha(0.5).restart();
    setNewLabel("");
    setAdding(false);
    setTick(t => t + 1);
  };

  const nodes = nodesRef.current || [];
  const links = linksRef.current || [];
  const cross = crossRef.current || [];
  const visible = filterCtx ? nodes.filter(n => !n.ctx || n.ctx === filterCtx || n.tier === "life_track") : nodes;
  const visibleIds = new Set(visible.map(n => n.id));

  const selNode = selected ? nodes.find(n => n.id === selected.id) : null;
  const children = selNode ? nodes.filter(n => n.parent === selNode.id) : [];
  const connectedCross = selNode ? cross.filter(l => {
    const s = l.source.id || l.source;
    const t = l.target.id || l.target;
    return s === selNode.id || t === selNode.id;
  }) : [];

  return (
    <div style={{ width: "100%", height: "100vh", background: "#080C18", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", color: "#c8d0e0", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "1px solid #1a2040", flexShrink: 0, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#e0e6f0", letterSpacing: "0.05em", textTransform: "uppercase" }}>Phase Constellation</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11 }}>
          <span style={{ color: "#6b7394" }}>Filter:</span>
          <button onClick={() => setFilterCtx(null)} style={pillStyle(null, filterCtx === null)}>All</button>
          {Object.entries(CTX_COLORS).map(([k, c]) => (
            <button key={k} onClick={() => setFilterCtx(k)} style={pillStyle(c, filterCtx === k)}>{k}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10, color: "#4a5278", marginLeft: 12 }}>
          {Object.entries(PHASE).map(([k, v]) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color, boxShadow: `0 0 6px ${v.color}60` }} />
              {v.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }} ref={containerRef}>
        {/* SVG Graph */}
        <svg
          ref={svgRef}
          width={dims.w} height={dims.h}
          style={{ position: "absolute", top: 0, left: 0, cursor: dragRef.current ? "grabbing" : "default" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onClick={() => { if (!dragRef.current) setSelected(null); }}
        >
          <defs>
            {Object.entries(PHASE).map(([k, v]) => (
              <filter key={k} id={`glow_${k}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feColorMatrix in="blur" type="matrix" values={`0 0 0 0 ${parseInt(v.color.slice(1,3),16)/255} 0 0 0 0 ${parseInt(v.color.slice(3,5),16)/255} 0 0 0 0 ${parseInt(v.color.slice(5,7),16)/255} 0 0 0 0.6 0`} />
                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>

          {/* Ambient dots */}
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={`star${i}`} cx={(i * 137.508) % dims.w} cy={(i * 89.333) % dims.h}
              r={0.5 + (i % 3) * 0.4} fill="#2a3460" opacity={0.3 + (i % 5) * 0.1} />
          ))}

          {/* Parent links */}
          {links.map((l, i) => {
            const s = typeof l.source === "object" ? l.source : nodes.find(n => n.id === l.source);
            const t = typeof l.target === "object" ? l.target : nodes.find(n => n.id === l.target);
            if (!s || !t || !visibleIds.has(s.id) || !visibleIds.has(t.id)) return null;
            const isHighlight = selNode && (s.id === selNode.id || t.id === selNode.id);
            return (
              <line key={`pl${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={isHighlight ? "#3a4a70" : "#141a30"} strokeWidth={isHighlight ? 1.5 : 0.7} opacity={isHighlight ? 0.8 : 0.5} />
            );
          })}

          {/* Cross links */}
          {cross.map((l, i) => {
            const s = typeof l.source === "object" ? l.source : nodes.find(n => n.id === l.source);
            const t = typeof l.target === "object" ? l.target : nodes.find(n => n.id === l.target);
            if (!s || !t || !visibleIds.has(s.id) || !visibleIds.has(t.id)) return null;
            const isHighlight = selNode && (s.id === selNode.id || t.id === selNode.id);
            return (
              <line key={`cl${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={isHighlight ? "#F5C54280" : "#F5C54220"} strokeWidth={isHighlight ? 1.5 : 0.8}
                strokeDasharray="4 4" opacity={isHighlight ? 0.9 : 0.3} />
            );
          })}

          {/* Nodes */}
          {visible.map(n => {
            const r = TIERS[n.tier]?.r || 8;
            const pc = PHASE[n.phase];
            const isSel = selNode?.id === n.id;
            const isHov = hovered === n.id;
            const isChild = selNode && n.parent === selNode.id;
            const dim = selNode && !isSel && !isChild && !connectedCross.some(l => {
              const s = l.source.id || l.source;
              const t = l.target.id || l.target;
              return s === n.id || t === n.id;
            }) ? 0.3 : 1;

            return (
              <g key={n.id} opacity={dim}
                onMouseDown={e => handleMouseDown(e, n)}
                onTouchStart={e => handleTouchStart(e, n)}
                onClick={e => { e.stopPropagation(); setSelected(n); setAdding(false); }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                <circle cx={n.x} cy={n.y} r={r} fill={pc.bg} stroke={pc.color}
                  strokeWidth={isSel ? 2.5 : isHov ? 1.5 : 0.8}
                  filter={`url(#glow_${n.phase})`} />
                {n.ctx && CTX_COLORS[n.ctx] && (
                  <circle cx={n.x} cy={n.y} r={r + 3} fill="none"
                    stroke={CTX_COLORS[n.ctx]} strokeWidth={1.2} opacity={0.4}
                    strokeDasharray={n.tier === "life_track" ? "none" : "2 3"} />
                )}
                {isSel && (
                  <circle cx={n.x} cy={n.y} r={r + 6} fill="none"
                    stroke="#fff" strokeWidth={1} opacity={0.5} strokeDasharray="3 3">
                    <animateTransform attributeName="transform" type="rotate"
                      from={`0 ${n.x} ${n.y}`} to={`360 ${n.x} ${n.y}`} dur="8s" repeatCount="indefinite" />
                  </circle>
                )}
                {(r > 10 || isHov || isSel) && (
                  <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                    fill={isSel ? "#e0e6f0" : "#6b7394"} fontSize={n.tier === "life_track" ? 11 : n.tier === "goal" ? 8 : 9}
                    fontWeight={isSel ? 600 : 400} style={{ pointerEvents: "none", userSelect: "none" }}>
                    {n.label.length > 22 ? n.label.slice(0, 20) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Detail Panel */}
        {selNode && (
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 280,
            background: "#0d1225ee", borderLeft: "1px solid #1a2040",
            padding: 16, overflowY: "auto", backdropFilter: "blur(12px)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 10, color: "#6b7394", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {TIERS[selNode.tier]?.z !== undefined ? ["Life Track", "Realm", "Network", "Initiative", "Goal"][TIERS[selNode.tier].z] : selNode.tier}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#e0e6f0", marginTop: 2 }}>{selNode.label}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6b7394", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {selNode.ctx && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: CTX_COLORS[selNode.ctx] }} />
                <span style={{ color: "#8892b0", textTransform: "capitalize" }}>{selNode.ctx}</span>
              </div>
            )}

            <div>
              <div style={{ fontSize: 10, color: "#6b7394", marginBottom: 6, textTransform: "uppercase" }}>Phase</div>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(PHASE).map(([k, v]) => (
                  <button key={k} onClick={() => changePhase(selNode.id, k)}
                    style={{
                      flex: 1, padding: "6px 0", fontSize: 10, border: `1px solid ${selNode.phase === k ? v.color : "#1a2040"}`,
                      borderRadius: 4, background: selNode.phase === k ? v.bg : "transparent",
                      color: selNode.phase === k ? v.color : "#4a5278", cursor: "pointer",
                      fontWeight: selNode.phase === k ? 600 : 400,
                    }}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {children.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#6b7394", marginBottom: 6, textTransform: "uppercase" }}>Children ({children.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {children.map(c => (
                    <div key={c.id} onClick={() => setSelected(c)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, cursor: "pointer", background: "#0a0e1a", border: "1px solid #141a30" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: PHASE[c.phase].color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#8892b0" }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {connectedCross.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "#F5C542", marginBottom: 6, textTransform: "uppercase" }}>Cross-connections</div>
                {connectedCross.map((l, i) => {
                  const s = l.source.id || l.source;
                  const t = l.target.id || l.target;
                  const other = s === selNode.id ? t : s;
                  const otherNode = nodes.find(n => n.id === other);
                  return otherNode ? (
                    <div key={i} onClick={() => setSelected(otherNode)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 4, cursor: "pointer", background: "#1a1a10", border: "1px solid #2a2a1a" }}>
                      <span style={{ fontSize: 11, color: "#F5C542" }}>↔</span>
                      <span style={{ fontSize: 11, color: "#c0b060" }}>{otherNode.label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <div style={{ borderTop: "1px solid #1a2040", paddingTop: 12, marginTop: 4 }}>
              {!adding ? (
                <button onClick={() => setAdding(true)} style={{
                  width: "100%", padding: "8px 0", fontSize: 11, background: "transparent",
                  border: "1px dashed #2a3460", borderRadius: 4, color: "#5a6a90", cursor: "pointer",
                }}>+ Add child node</button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label…"
                    style={{ background: "#0a0e1a", border: "1px solid #1a2040", borderRadius: 4, padding: "6px 8px", color: "#c8d0e0", fontSize: 12, outline: "none" }}
                    onKeyDown={e => e.key === "Enter" && addNode()} autoFocus />
                  <div style={{ display: "flex", gap: 4 }}>
                    <select value={newTier} onChange={e => setNewTier(e.target.value)}
                      style={{ flex: 1, background: "#0a0e1a", border: "1px solid #1a2040", borderRadius: 4, padding: "4px", color: "#8892b0", fontSize: 10 }}>
                      {Object.keys(TIERS).map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                    </select>
                    <select value={newPhase} onChange={e => setNewPhase(e.target.value)}
                      style={{ flex: 1, background: "#0a0e1a", border: "1px solid #1a2040", borderRadius: 4, padding: "4px", color: "#8892b0", fontSize: 10 }}>
                      {Object.keys(PHASE).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={addNode} style={{ flex: 1, padding: "6px", background: "#1a2a50", border: "none", borderRadius: 4, color: "#5BC0F8", fontSize: 11, cursor: "pointer" }}>Add</button>
                    <button onClick={() => setAdding(false)} style={{ flex: 1, padding: "6px", background: "#1a1a20", border: "none", borderRadius: 4, color: "#6b7394", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #1a2040", paddingTop: 12, marginTop: "auto" }}>
              <div style={{ fontSize: 9, color: "#3a4268", lineHeight: 1.5 }}>
                Drag nodes to reposition · Click to inspect · Phase changes propagate visually · Cross-connections shown as dashed gold lines
              </div>
            </div>
          </div>
        )}

        {/* Tier legend */}
        <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", gap: 10, alignItems: "flex-end", fontSize: 9, color: "#3a4268" }}>
          {Object.entries(TIERS).map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: v.r * 1.2, height: v.r * 1.2, borderRadius: "50%", border: "1px solid #1a2040" }} />
              <span>{k.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function pillStyle(color, active) {
  return {
    padding: "3px 10px", borderRadius: 12, fontSize: 10, cursor: "pointer",
    border: `1px solid ${active ? (color || "#5BC0F8") : "#1a2040"}`,
    background: active ? (color ? color + "20" : "#1a2a50") : "transparent",
    color: active ? (color || "#5BC0F8") : "#4a5278",
    textTransform: "capitalize", fontWeight: active ? 600 : 400,
  };
}
