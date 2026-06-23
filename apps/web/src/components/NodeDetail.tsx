import { useEffect, useState } from 'react';
import { X, Plus, Archive, CornerDownRight } from 'lucide-react';
import { api, type Annotation, type GraphNode, type Phase } from '../lib/api';
import { GraphModel, PHASE_LABEL, PHASE_VARS } from '../lib/graph';
import { Button, PhaseChip, PhaseDot, Section } from './ui';

interface Props {
  model: GraphModel;
  node: GraphNode;
  onSelect: (id: string) => void;
  onClose: () => void;
  onSetPhase: (id: string, phase: Phase) => void;
  onAddChild: (parent: GraphNode, label: string) => Promise<void>;
  onArchive: (id: string) => void;
}

function RelationList({
  nodes,
  empty,
  onSelect,
}: {
  nodes: GraphNode[];
  empty: string;
  onSelect: (id: string) => void;
}) {
  if (nodes.length === 0) {
    return <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-disabled)' }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {nodes.map((n) => (
        <button
          key={n.id}
          onClick={() => onSelect(n.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--bg-raised)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <PhaseDot phase={n.phase} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', flex: 1 }}>
            {n.label}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {n.kind === 'super' ? 'supernode' : n.tier.replace('_', ' ')}
          </span>
        </button>
      ))}
    </div>
  );
}

export function NodeDetail({ model, node, onSelect, onClose, onSetPhase, onAddChild, onArchive }: Props) {
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [childDraft, setChildDraft] = useState('');
  const [addingChild, setAddingChild] = useState(false);

  useEffect(() => {
    let live = true;
    api
      .listAnnotations('node', node.id)
      .then((a) => live && setNotes(a))
      .catch(() => live && setNotes([]));
    return () => {
      live = false;
    };
  }, [node.id]);

  const parents = model.parents(node.id);
  const children = model.children(node.id);
  const members = model.members(node.id);
  const belongsTo = model.belongsTo(node.id);
  const crossLinks = model.crossLinks(node.id);
  const isSuper = node.kind === 'super';

  const submitNote = async () => {
    if (!noteDraft.trim()) return;
    await api.addNote({ ownerType: 'node', ownerId: node.id, body: noteDraft.trim() });
    setNoteDraft('');
    setNotes(await api.listAnnotations('node', node.id));
  };
  const submitChild = async () => {
    if (!childDraft.trim()) return;
    await onAddChild(node, childDraft.trim());
    setChildDraft('');
    setAddingChild(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhaseChip phase={node.phase} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {isSuper ? 'supernode' : node.tier.replace('_', ' ')}
              {node.ctx ? ` · ${node.ctx}` : ''}
            </span>
          </div>
          <h2 style={{ fontSize: 'var(--text-h3)' }}>{node.label}</h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {isSuper ? `${members.length} members` : `${children.length} children`} · {notes.length} notes ·{' '}
            {crossLinks.length} cross-links
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Phase switcher */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => {
          const active = node.phase === p;
          return (
            <button
              key={p}
              onClick={() => onSetPhase(node.id, p)}
              style={{
                flex: 1,
                padding: '7px 0',
                fontSize: 'var(--text-sm)',
                fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                border: `1px solid ${active ? PHASE_VARS[p].solid : 'var(--border-hairline)'}`,
                background: active ? PHASE_VARS[p].soft : 'var(--bg-raised)',
                color: active ? PHASE_VARS[p].deep : 'var(--text-muted)',
              }}
            >
              {PHASE_LABEL[p]}
            </button>
          );
        })}
      </div>

      <Section title="Parents" count={parents.length}>
        <RelationList nodes={parents} empty="No parent (top-level)" onSelect={onSelect} />
      </Section>

      {isSuper ? (
        <Section title="Members" count={members.length}>
          <RelationList nodes={members} empty="No members yet" onSelect={onSelect} />
        </Section>
      ) : (
        <Section title="Children" count={children.length}>
          <RelationList nodes={children} empty="No children" onSelect={onSelect} />
        </Section>
      )}

      <Section title="Belongs to (supernodes)" count={belongsTo.length}>
        <RelationList nodes={belongsTo} empty="Not in any supernode" onSelect={onSelect} />
      </Section>

      <Section title="Cross-links" count={crossLinks.length}>
        <RelationList nodes={crossLinks} empty="No cross-links" onSelect={onSelect} />
      </Section>

      {/* Notes */}
      <Section title="Notes" count={notes.length}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {notes.map((a) => (
            <div
              key={a.id}
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-body)',
                background: 'var(--bg-sunken)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 10px',
              }}
            >
              {a.body}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note…"
              onKeyDown={(e) => e.key === 'Enter' && submitNote()}
              style={inputStyle}
            />
            <Button size="sm" variant="primary" onClick={submitNote}>
              Add
            </Button>
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-hairline)', paddingTop: 'var(--space-4)' }}>
        {!isSuper &&
          (addingChild ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={childDraft}
                onChange={(e) => setChildDraft(e.target.value)}
                placeholder="New child label…"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && submitChild()}
                style={inputStyle}
              />
              <Button size="sm" variant="primary" onClick={submitChild}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddingChild(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setAddingChild(true)}>
              <CornerDownRight size={15} /> Add child node
            </Button>
          ))}
        <Button variant="danger" size="sm" onClick={() => onArchive(node.id)} style={{ alignSelf: 'flex-start' }}>
          <Archive size={14} /> Archive
        </Button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 10px',
  color: 'var(--text-body)',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
};
