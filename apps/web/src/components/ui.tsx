import type { CSSProperties, ReactNode } from 'react';
import { PHASE_LABEL, PHASE_VARS, type Phase } from '../lib/graph';

export function PhaseDot({ phase, size = 9 }: { phase: Phase; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: PHASE_VARS[phase].solid,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

/** Hollow rounded square used for group/parent rows in the outline. */
export function PhaseSquare({ phase }: { phase: Phase }) {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: 5,
        border: `2px solid ${PHASE_VARS[phase].solid}`,
        background: PHASE_VARS[phase].soft,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

export function PhaseChip({ phase }: { phase: Phase }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        background: PHASE_VARS[phase].soft,
        color: PHASE_VARS[phase].deep,
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semibold)',
      }}
    >
      <PhaseDot phase={phase} size={7} />
      {PHASE_LABEL[phase]}
    </span>
  );
}

export function CountBadge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: 'var(--accent)',
        background: 'var(--accent-tint)',
        borderRadius: 'var(--radius-pill)',
        padding: '2px 9px',
        fontWeight: 'var(--weight-medium)',
      }}
    >
      {children}
    </span>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  style?: CSSProperties;
  title?: string;
  type?: 'button' | 'submit';
};

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  style,
  title,
  type = 'button',
}: ButtonProps) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 'var(--radius-md)',
    fontSize: size === 'sm' ? 'var(--text-sm)' : 'var(--text-body-sz)',
    fontWeight: 'var(--weight-semibold)',
    padding: size === 'sm' ? '6px 10px' : '9px 14px',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'background var(--dur-fast) var(--ease-standard)',
    whiteSpace: 'nowrap',
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: 'var(--accent)', color: 'var(--text-on-accent)' },
    secondary: {
      background: 'var(--bg-raised)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-hairline)',
      boxShadow: 'var(--shadow-xs)',
    },
    ghost: { background: 'transparent', color: 'var(--text-muted)' },
    danger: { background: 'transparent', color: 'var(--critical)', border: '1px solid var(--critical-soft)' },
  };
  return (
    <button type={type} title={title} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

/** A labeled section in the detail panel (mono uppercase heading). */
export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
        }}
      >
        {title}
        {count != null && ` · ${count}`}
      </div>
      {children}
    </div>
  );
}
