import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Waypoints, ListTree, Sparkles, Inbox } from 'lucide-react';
import { api, type GraphNode, type Phase } from '../lib/api';
import { GraphModel } from '../lib/graph';
import { OutlineView } from './OutlineView';
import { GraphView } from './GraphView';
import { NodeDetail } from './NodeDetail';
import { Placeholder } from './Placeholder';

type Tab = 'outline' | 'graph' | 'brainstorm' | 'review';

const NAV: Array<{ tab: Tab; label: string; icon: ReactNode }> = [
  { tab: 'graph', label: 'Graph', icon: <Waypoints size={20} /> },
  { tab: 'outline', label: 'Outline', icon: <ListTree size={20} /> },
  { tab: 'brainstorm', label: 'Brainstorm', icon: <Sparkles size={20} /> },
  { tab: 'review', label: 'Review', icon: <Inbox size={20} /> },
];

export default function App() {
  const [model, setModel] = useState<GraphModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('outline');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const g = await api.getGraph();
      setModel(new GraphModel(g));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const guard = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const addNode = (input: { label: string; tier: string; phase: Phase; parentId?: string }) =>
    guard(async () => {
      const parent = input.parentId ? model?.get(input.parentId) : undefined;
      const { id } = await api.createNode({
        label: input.label,
        tier: input.tier,
        phase: input.phase,
        ctx: parent?.ctx ?? null,
      });
      if (input.parentId) {
        await api.linkEdge({ sourceId: input.parentId, targetId: id, type: 'parent' });
      }
      setSelectedId(id);
    });

  const addChild = (parent: GraphNode, label: string) =>
    guard(async () => {
      const { id } = await api.createNode({ label, tier: 'goal', phase: 'divergent', ctx: parent.ctx });
      await api.linkEdge({ sourceId: parent.id, targetId: id, type: 'parent' });
    });

  const setPhase = (id: string, phase: Phase) => guard(() => api.setPhase(id, phase));
  const archive = (id: string) =>
    guard(async () => {
      await api.archiveNode(id);
      setSelectedId(null);
    });

  const createSupernode = (label: string, memberIds: string[]) =>
    guard(async () => {
      const { id } = await api.createSupernode({ label, memberIds });
      setSelectedId(id);
    });

  const selected = selectedId && model ? model.get(selectedId) : undefined;

  let view: ReactNode = null;
  if (loading) {
    view = <Centered>Loading graph…</Centered>;
  } else if (!model) {
    view = <Centered>Could not load the graph.</Centered>;
  } else if (tab === 'outline') {
    view = (
      <OutlineView
        model={model}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onAddNode={addNode}
        onCreateSupernode={createSupernode}
      />
    );
  } else if (tab === 'graph') {
    view = <GraphView model={model} selectedId={selectedId} onSelect={setSelectedId} />;
  } else if (tab === 'brainstorm') {
    view = (
      <Placeholder icon={<Sparkles size={40} />} title="Brainstorm" phase="Phase 2">
        Select a scope, write a prompt, and an LLM researches it under retrieval constraints. Drafts
        land in Review for you to vet before they join the graph.
      </Placeholder>
    );
  } else {
    view = (
      <Placeholder icon={<Inbox size={40} />} title="Review queue" phase="Phase 1">
        One queue for Zotero matches, RAG drafts, and spreadsheet imports — accept, edit, or reject,
        most-uncertain first. Nothing reaches the graph unvetted.
      </Placeholder>
    );
  }

  return (
    <div className="phr-app">
      <nav className="phr-nav">
        {NAV.map((item) => (
          <button
            key={item.tab}
            className="phr-nav-item"
            data-active={tab === item.tab}
            onClick={() => setTab(item.tab)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <main className="phr-content">
        {error && (
          <div
            style={{
              background: 'var(--critical-soft)',
              color: 'var(--critical)',
              fontSize: 'var(--text-sm)',
              padding: '8px 16px',
            }}
          >
            {error}{' '}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, cursor: 'pointer' }}>
              dismiss
            </button>
          </div>
        )}
        {view}
      </main>

      {selected && model && (
        <>
          <div className="phr-scrim" onClick={() => setSelectedId(null)} />
          <aside className="phr-detail">
            <NodeDetail
              model={model}
              node={selected}
              onSelect={setSelectedId}
              onClose={() => setSelectedId(null)}
              onSetPhase={setPhase}
              onAddChild={addChild}
              onArchive={archive}
            />
          </aside>
        </>
      )}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)' }}>
      {children}
    </div>
  );
}
