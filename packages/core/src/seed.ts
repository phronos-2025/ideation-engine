/**
 * Seed the database with the prototype's constellation graph, written THROUGH
 * the action layer (so each insert emits an event, exercising the real write
 * path). Idempotent guard: refuses to run if the graph already has nodes.
 *
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/phronos pnpm db:seed
 */
import { createDb, node } from '@phronos/db';
import { createActions } from './actions.js';
import { systemContext } from './context.js';

interface SeedNode {
  id: string;
  label: string;
  tier: string;
  phase: 'divergent' | 'convergent' | 'operational';
  ctx: string | null;
  parent: string | null;
}

const SEED_NODES: SeedNode[] = [
  { id: 'pro', label: 'Professional', tier: 'life_track', phase: 'operational', ctx: null, parent: null },
  { id: 'per', label: 'Personal', tier: 'life_track', phase: 'divergent', ctx: 'personal', parent: null },
  { id: 'stanford', label: 'Stanford', tier: 'realm', phase: 'operational', ctx: 'stanford', parent: 'pro' },
  { id: 'phronos', label: 'Phronos', tier: 'realm', phase: 'convergent', ctx: 'phronos', parent: 'pro' },
  { id: 'syndromic', label: 'Syndromic', tier: 'realm', phase: 'convergent', ctx: 'syndromic', parent: 'pro' },
  { id: 'life', label: 'Life Admin', tier: 'realm', phase: 'divergent', ctx: 'personal', parent: 'per' },
  { id: 'lane', label: 'Lane Library', tier: 'network', phase: 'operational', ctx: 'stanford', parent: 'stanford' },
  { id: 'infra', label: 'Infrastructure', tier: 'initiative', phase: 'convergent', ctx: 'stanford', parent: 'lane' },
  { id: 'ops', label: 'Operations', tier: 'initiative', phase: 'operational', ctx: 'stanford', parent: 'lane' },
  { id: 'analytics', label: 'Analytics', tier: 'initiative', phase: 'convergent', ctx: 'stanford', parent: 'lane' },
  { id: 'policy', label: 'Policy', tier: 'initiative', phase: 'operational', ctx: 'stanford', parent: 'lane' },
  { id: 'advocacy', label: 'Advocacy', tier: 'initiative', phase: 'divergent', ctx: 'stanford', parent: 'lane' },
  { id: 'visibility', label: 'Institutional Visibility', tier: 'initiative', phase: 'convergent', ctx: 'stanford', parent: 'lane' },
  { id: 'education', label: 'Education', tier: 'initiative', phase: 'operational', ctx: 'stanford', parent: 'lane' },
  { id: 'space', label: 'Space & Presence', tier: 'initiative', phase: 'divergent', ctx: 'stanford', parent: 'lane' },
  { id: 'rnd', label: 'R&D + Scholarship', tier: 'initiative', phase: 'divergent', ctx: 'stanford', parent: 'lane' },
  { id: 'g_meta', label: 'LaneSearch metadata augmentation', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'infra' },
  { id: 'g_vec', label: 'Solr vector search', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'infra' },
  { id: 'g_api', label: 'LaneSearch APIs · agentic', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'infra' },
  { id: 'g_libmeta', label: 'Librarian metadata processes', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'ops' },
  { id: 'g_policies', label: 'IT & AI policies', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'ops' },
  { id: 'g_aitools', label: 'AI tools for efficiency', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'ops' },
  { id: 'g_dashboards', label: 'Standardize dashboards', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'analytics' },
  { id: 'g_feedback', label: 'User-centric feedback', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'analytics' },
  { id: 'g_community', label: 'Stakeholder community', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'analytics' },
  { id: 'g_folio', label: 'FOLIO AIML group', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'policy' },
  { id: 'g_watch', label: 'Watch AI4LAM · Code4lib · CHT', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'policy' },
  { id: 'g_thought', label: 'AI/ML thought leadership', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'advocacy' },
  { id: 'g_funding', label: 'Apply for funding', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'visibility' },
  { id: 'g_literacy_adv', label: 'AI literacy advocacy', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'visibility' },
  { id: 'g_meded', label: 'Library in AI in MedEd', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'visibility' },
  { id: 'g_eps', label: 'EPS AI Community of Practice', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'visibility' },
  { id: 'g_hai', label: 'HAI seminars', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'visibility' },
  { id: 'g_twin', label: 'Digital Twin Lab', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'education' },
  { id: 'g_agentlab', label: 'Agentic workflow labs', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'education' },
  { id: 'g_littools', label: 'AI Literacy tools & classes', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'education' },
  { id: 'g_cisl', label: 'CISL simulations', tier: 'goal', phase: 'convergent', ctx: 'stanford', parent: 'education' },
  { id: 'g_augskills', label: 'AI-augmented class skills', tier: 'goal', phase: 'operational', ctx: 'stanford', parent: 'education' },
  { id: 'g_align', label: 'Class alignment w/ institutes', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'education' },
  { id: 'g_archive', label: 'Historical archive engagement', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'space' },
  { id: 'g_maker', label: 'AI maker labs · physical space', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'space' },
  { id: 'g_kpe', label: 'Knowledge Provenance Engine', tier: 'goal', phase: 'divergent', ctx: 'stanford', parent: 'rnd' },
];

const SEED_CROSS: Array<{ source: string; target: string }> = [
  { source: 'g_api', target: 'g_agentlab' },
  { source: 'g_literacy_adv', target: 'g_littools' },
  { source: 'g_kpe', target: 'g_meta' },
  { source: 'g_twin', target: 'g_cisl' },
  { source: 'g_maker', target: 'g_twin' },
  { source: 'g_thought', target: 'g_kpe' },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Set DATABASE_URL to seed.');
  const { db, close } = createDb(connectionString);
  const actions = createActions(db);
  const ctx = systemContext();

  try {
    const existing = await db.select({ id: node.id }).from(node).limit(1);
    if (existing.length > 0) {
      console.log('Graph already has nodes — skipping seed (idempotent guard).');
      return;
    }

    const idMap = new Map<string, string>();
    for (const n of SEED_NODES) {
      const uuid = await actions.createNode(ctx, {
        label: n.label,
        tier: n.tier,
        phase: n.phase,
        ctx: n.ctx,
      });
      idMap.set(n.id, uuid);
    }
    let parentEdges = 0;
    for (const n of SEED_NODES) {
      if (!n.parent) continue;
      await actions.linkEdge(ctx, {
        sourceId: idMap.get(n.parent)!,
        targetId: idMap.get(n.id)!,
        type: 'parent',
      });
      parentEdges++;
    }
    for (const c of SEED_CROSS) {
      await actions.linkEdge(ctx, {
        sourceId: idMap.get(c.source)!,
        targetId: idMap.get(c.target)!,
        type: 'cross',
      });
    }
    console.log(
      `Seeded ${SEED_NODES.length} nodes, ${parentEdges} parent edges, ${SEED_CROSS.length} cross edges.`,
    );
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
