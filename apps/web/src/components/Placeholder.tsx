import type { ReactNode } from 'react';

export function Placeholder({ icon, title, phase, children }: { icon: ReactNode; title: string; phase: string; children: ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-6)',
        color: 'var(--text-faint)',
      }}
    >
      <div style={{ color: 'var(--indigo-2)' }}>{icon}</div>
      <h2 style={{ fontSize: 'var(--text-h3)' }}>{title}</h2>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--accent)',
          background: 'var(--accent-tint)',
          borderRadius: 'var(--radius-pill)',
          padding: '3px 10px',
        }}
      >
        {phase}
      </div>
      <p style={{ maxWidth: 320, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 'var(--leading-normal)' }}>
        {children}
      </p>
    </div>
  );
}
