import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Hexagon, CircleCheck, Circle, Layers } from 'lucide-react';
import type { GraphNode, Phase } from '../lib/api';
import { GraphModel } from '../lib/graph';
import { Button, CountBadge, PhaseDot, PhaseSquare } from './ui';

interface Props {
  model: GraphModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddNode: (input: { label: string; tier: string; phase: Phase; parentId?: string }) => Promise<void>;
  onCreateSupernode: (label: string, memberIds: string[]) => Promise<void>;
}

const TIERS = ['life_track', 'realm', 'network', 'initiative', 'goal'];

export function OutlineView({ model, selectedId, onSelect, onAddNode, onCreateSupernode }: Props) {
  const [tab, setTab] = useState<'outline' | 'edges'>('outline');
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(model.roots().map((r) => r.id)),
  );
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [tier, setTier] = useState('goal');
  const [phase, setPhase] = useState<Phase>('divergent');
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [superName, setSuperName] = useState('');

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exitSelect = () => {
    setSelectMode(false);
    setPicked(new Set());
    setSuperName('');
  };

  const groupIntoSupernode = async () => {
    if (picked.size < 2 || !superName.trim()) return;
    await onCreateSupernode(superName.trim(), [...picked]);
    exitSelect();
  };

  const rowClick = (id: string) => (selectMode ? togglePick(id) : onSelect(id));

  const submit = async () => {
    if (!label.trim()) return;
    await onAddNode({
      label: label.trim(),
      tier,
      phase,
      parentId: selectedId ?? undefined,
    });
    setLabel('');
    setAdding(false);
  };

  const renderRow = (node: GraphNode, depth: number) => {
    const children = model.children(node.id);
    const hasKids = children.length > 0;
    const isOpen = expanded.has(node.id);
    const selected = selectedId === node.id;
    const isPicked = picked.has(node.id);
    const highlight = selectMode ? isPicked : selected;
    return (
      <div key={node.id}>
        <div
          onClick={() => rowClick(node.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            paddingLeft: 12 + depth * 18,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            border: `1px solid ${highlight ? 'var(--indigo-1)' : 'transparent'}`,
            background: highlight ? 'var(--accent-tint)' : 'transparent',
          }}
        >
          {selectMode &&
            (isPicked ? (
              <CircleCheck size={18} color="var(--accent)" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={18} color="var(--text-disabled)" style={{ flexShrink: 0 }} />
            ))}
          {hasKids ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.id);
              }}
              aria-label={isOpen ? 'Collapse' : 'Expand'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 0, display: 'flex' }}
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span style={{ width: 16, flexShrink: 0 }} />
          )}
          {depth === 0 ? <PhaseSquare phase={node.phase} /> : <PhaseDot phase={node.phase} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: depth === 0 ? 'var(--text-title)' : 'var(--text-body-sz)',
                fontWeight: depth === 0 ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                color: 'var(--text-strong)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {hasKids ? `${model.descendantCount(node.id)} nodes` : node.tier.replace('_', ' ')}
            </div>
          </div>
          {hasKids && <CountBadge>{children.length}</CountBadge>}
        </div>
        {isOpen && children.map((c) => renderRow(c, depth + 1))}
      </div>
    );
  };

  const supernodes = model.supernodes();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', gap: 8 }}>
        <h1 style={{ fontSize: 'var(--text-h1)' }}>Outline</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant={selectMode ? 'secondary' : 'ghost'}
            onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
            title="Select multiple nodes to group into a supernode"
          >
            <Layers size={16} /> {selectMode ? 'Cancel' : 'Group'}
          </Button>
          {!selectMode && (
            <Button variant="primary" onClick={() => setAdding((v) => !v)}>
              <Plus size={16} /> Node
            </Button>
          )}
        </div>
      </div>

      {/* Subtabs */}
      <div style={{ display: 'flex', gap: 'var(--space-5)', padding: '0 var(--space-4)', borderBottom: '1px solid var(--border-hairline)' }}>
        {(['outline', 'edges'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 10px',
              fontSize: 'var(--text-body-sz)',
              textTransform: 'capitalize',
              fontWeight: tab === t ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              color: tab === t ? 'var(--text-strong)' : 'var(--text-faint)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ display: 'flex', gap: 6, padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-sunken)', flexWrap: 'wrap' }}>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={selectedId ? 'New child label…' : 'New top-level node…'}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{ flex: '1 1 160px', background: 'var(--bg-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'var(--font-sans)' }}
          />
          <select value={tier} onChange={(e) => setTier(e.target.value)} style={selectStyle}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)} style={selectStyle}>
            {(['divergent', 'convergent', 'operational'] as Phase[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={submit}>
            Add
          </Button>
        </div>
      )}
      {adding && selectedId && (
        <div style={{ padding: '4px var(--space-4) 0', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
          Will be added under: <strong>{model.get(selectedId)?.label}</strong>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3) var(--space-2)' }}>
        {tab === 'outline' ? (
          <>
            {model.roots().map((r) => renderRow(r, 0))}
            {supernodes.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', padding: '0 12px' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xs)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-faint)',
                    margin: '0 0 8px',
                  }}
                >
                  Supernodes · {supernodes.length}
                </div>
                {supernodes.map((s) => {
                  const selected = selectedId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelect(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: `1px solid ${selected ? 'var(--indigo-1)' : 'var(--border-hairline)'}`,
                        background: selected ? 'var(--accent-tint)' : 'var(--bg-raised)',
                        marginBottom: 6,
                      }}
                    >
                      <Hexagon size={16} color="var(--accent)" />
                      <span style={{ flex: 1, fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)' }}>
                        {s.label}
                      </span>
                      <CountBadge>{model.members(s.id).length}</CountBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <EdgesList model={model} onSelect={onSelect} />
        )}
      </div>

      {selectMode && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--border-hairline)',
            background: 'var(--bg-sunken)',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {picked.size === 0
              ? 'Tap nodes to add them to a supernode'
              : `${picked.size} selected${picked.size < 2 ? ' · pick at least 2' : ''}`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={superName}
              onChange={(e) => setSuperName(e.target.value)}
              placeholder="Name the supernode…"
              onKeyDown={(e) => e.key === 'Enter' && groupIntoSupernode()}
              style={{
                flex: 1,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
                fontSize: 'var(--text-sm)',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={groupIntoSupernode}
              style={picked.size < 2 || !superName.trim() ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            >
              <Hexagon size={15} /> Create
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EdgesList({ model, onSelect }: { model: GraphModel; onSelect: (id: string) => void }) {
  const groups: Array<{ type: 'parent' | 'cross' | 'contains'; label: string }> = [
    { type: 'parent', label: 'Hierarchy (parent)' },
    { type: 'cross', label: 'Lateral (cross)' },
    { type: 'contains', label: 'Containment (supernode)' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: '0 12px' }}>
      {groups.map((g) => {
        const edges = model.edges.filter((e) => e.type === g.type);
        return (
          <div key={g.type}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-faint)',
                marginBottom: 8,
              }}
            >
              {g.label} · {edges.length}
            </div>
            {edges.length === 0 ? (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-disabled)' }}>None</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {edges.map((e) => {
                  const s = model.get(e.sourceId);
                  const t = model.get(e.targetId);
                  if (!s || !t) return null;
                  return (
                    <div
                      key={e.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 'var(--text-sm)',
                        padding: '6px 0',
                      }}
                    >
                      <button onClick={() => onSelect(s.id)} style={edgeNodeStyle}>
                        <PhaseDot phase={s.phase} size={7} /> {s.label}
                      </button>
                      <span style={{ color: 'var(--text-faint)' }}>→</span>
                      <button onClick={() => onSelect(t.id)} style={edgeNodeStyle}>
                        <PhaseDot phase={t.phase} size={7} /> {t.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-sans)',
};

const edgeNodeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '4px 8px',
  cursor: 'pointer',
  color: 'var(--text-body)',
  fontSize: 'var(--text-sm)',
};
