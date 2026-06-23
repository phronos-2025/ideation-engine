/* @ds-bundle: {"format":3,"namespace":"PhronosDesignSystem_cf863b","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"PhaseTag","sourcePath":"components/core/PhaseTag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"NodeChip","sourcePath":"components/graph/NodeChip.jsx"},{"name":"ReviewCard","sourcePath":"components/graph/ReviewCard.jsx"},{"name":"SegmentedControl","sourcePath":"components/navigation/SegmentedControl.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"0a16b1e2be14","components/core/Badge.jsx":"22dfe27bc59b","components/core/Button.jsx":"5f4a43c86f23","components/core/Card.jsx":"e9f6ceb3fb89","components/core/IconButton.jsx":"d412fe11a364","components/core/PhaseTag.jsx":"841b631f0c06","components/feedback/Dialog.jsx":"37c8ab728bda","components/feedback/Toast.jsx":"3c4bc434676c","components/feedback/Tooltip.jsx":"8d965d6f55b0","components/forms/Checkbox.jsx":"3ae56a9f4280","components/forms/Input.jsx":"7e14d2ad6fd6","components/forms/Select.jsx":"ba1b341146c6","components/forms/Switch.jsx":"a6d9199803c0","components/forms/Textarea.jsx":"5de9253b5568","components/graph/NodeChip.jsx":"3a669274baa4","components/graph/ReviewCard.jsx":"5cf00fc71b73","components/navigation/SegmentedControl.jsx":"23db49832abe","components/navigation/Tabs.jsx":"240f3c66dc22","ui_kits/mobile/App.jsx":"aa390b55efe8","ui_kits/mobile/BrainstormScreen.jsx":"b1f5e2c7acf9","ui_kits/mobile/Constellation.jsx":"c95307bb8557","ui_kits/mobile/GraphScreen.jsx":"f59917bbc674","ui_kits/mobile/OutlineScreen.jsx":"0d8adf58b243","ui_kits/mobile/ReviewScreen.jsx":"22c7952d2a56"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PhronosDesignSystem_cf863b = window.PhronosDesignSystem_cf863b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Avatar — the single user / actor mark. Supports an image,
 * initials fallback, and an "agent" mode for simulated actors (square-ish,
 * indigo, mono glyph) to keep human vs. agent legible per FR-I3.
 */
function Avatar({
  src = null,
  name = '',
  size = 36,
  actor = 'human',
  style = {},
  ...rest
}) {
  const initials = (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·';
  const isAgent = actor === 'agent';
  return /*#__PURE__*/React.createElement("span", _extends({
    title: name,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flex: 'none',
      borderRadius: isAgent ? 'var(--radius-sm)' : '50%',
      background: src ? 'transparent' : isAgent ? 'var(--indigo-5)' : 'var(--paper-2)',
      color: isAgent ? 'var(--indigo-1)' : 'var(--ink-2)',
      border: isAgent ? '1px solid var(--indigo-4)' : '1px solid var(--border-hairline)',
      fontFamily: isAgent ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: Math.round(size * 0.38),
      fontWeight: 600,
      overflow: 'hidden',
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : isAgent ? '∿' : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Badge — a small count / label token. Quieter than PhaseTag;
 * used for counts (review queue), versions, and inline metadata.
 */
function Badge({
  tone = 'neutral',
  variant = 'soft',
  children,
  style = {},
  ...rest
}) {
  const tones = {
    neutral: {
      soft: ['var(--paper-2)', 'var(--ink-2)'],
      solid: ['var(--ink-1)', '#fff'],
      outline: ['transparent', 'var(--ink-2)']
    },
    accent: {
      soft: ['var(--indigo-0)', 'var(--indigo-4)'],
      solid: ['var(--accent)', '#fff'],
      outline: ['transparent', 'var(--accent)']
    },
    positive: {
      soft: ['var(--operational-0)', 'var(--operational-3)'],
      solid: ['var(--operational-2)', '#fff'],
      outline: ['transparent', 'var(--operational-3)']
    },
    caution: {
      soft: ['var(--convergent-0)', 'var(--convergent-3)'],
      solid: ['var(--convergent-2)', '#fff'],
      outline: ['transparent', 'var(--convergent-3)']
    },
    critical: {
      soft: ['var(--critical-soft)', 'var(--critical)'],
      solid: ['var(--critical)', '#fff'],
      outline: ['transparent', 'var(--critical)']
    }
  };
  const pair = (tones[tone] || tones.neutral)[variant] || (tones[tone] || tones.neutral).soft;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 6px',
      background: pair[0],
      color: pair[1],
      border: variant === 'outline' ? '1px solid currentColor' : '1px solid transparent',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1,
      letterSpacing: '0.02em',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Button — the primary action primitive.
 * Variants: primary (indigo), secondary (paper outline), ghost, danger.
 * Sizes: sm, md, lg. Quiet press (1px nudge), no glossy gradients.
 */
function Button({
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  full = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      height: 34,
      padding: '0 12px',
      fontSize: 13,
      gap: 6,
      radius: 'var(--radius-sm)'
    },
    md: {
      height: 42,
      padding: '0 16px',
      fontSize: 14,
      gap: 8,
      radius: 'var(--radius-md)'
    },
    lg: {
      height: 50,
      padding: '0 22px',
      fontSize: 15,
      gap: 9,
      radius: 'var(--radius-md)'
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      border: '1px solid var(--accent)',
      boxShadow: 'var(--shadow-xs)'
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--text-strong)',
      border: '1px solid var(--border-strong)',
      boxShadow: 'var(--shadow-xs)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-body)',
      border: '1px solid transparent'
    },
    danger: {
      background: 'var(--critical)',
      color: '#fff',
      border: '1px solid var(--critical)'
    }
  };
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const v = variants[variant] || variants.primary;
  const hoverBg = {
    primary: 'var(--accent-hover)',
    secondary: 'var(--surface-hover)',
    ghost: 'var(--surface-hover)',
    danger: '#A93B30'
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      width: full ? '100%' : 'auto',
      height: s.height,
      padding: s.padding,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      fontWeight: 600,
      letterSpacing: '0.01em',
      lineHeight: 1,
      borderRadius: s.radius,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      transform: active && !disabled ? 'translateY(1px)' : 'translateY(0)',
      transition: 'background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard), border-color var(--dur-fast)',
      ...v,
      ...(hover && !disabled ? {
        background: hoverBg
      } : null),
      ...style
    }
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Card — the base surface. White on parchment with a hairline
 * border and a soft low shadow. Supports an optional phase accent on the
 * left edge and interactive hover lift.
 */
function Card({
  interactive = false,
  phase = null,
  padding = 'md',
  elevation = 'sm',
  onClick,
  children,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const pad = {
    none: 0,
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-5)'
  }[padding];
  const shadow = {
    none: 'none',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)'
  }[elevation];
  const phaseColor = phase ? {
    divergent: 'var(--divergent-2)',
    convergent: 'var(--convergent-2)',
    operational: 'var(--operational-2)'
  }[phase] : null;
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: interactive && hover ? 'var(--shadow-md)' : shadow,
      padding: pad,
      cursor: interactive ? 'pointer' : 'default',
      transform: interactive && hover ? 'translateY(-1px)' : 'none',
      transition: 'box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)',
      overflow: 'hidden',
      ...style
    }
  }, rest), phaseColor && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      background: phaseColor
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos IconButton — square, icon-only affordance for toolbars,
 * graph controls, and row actions. Pass a Lucide icon node as children.
 */
function IconButton({
  size = 'md',
  variant = 'ghost',
  label,
  active = false,
  disabled = false,
  onClick,
  children,
  style = {},
  ...rest
}) {
  const dims = {
    sm: 32,
    md: 38,
    lg: 44
  }[size] || 38;
  const [hover, setHover] = React.useState(false);
  const base = {
    ghost: {
      background: 'transparent',
      color: 'var(--text-muted)',
      border: '1px solid transparent'
    },
    outline: {
      background: 'var(--surface-card)',
      color: 'var(--text-body)',
      border: '1px solid var(--border-hairline)'
    },
    night: {
      background: 'var(--night-2)',
      color: 'var(--starlight-2)',
      border: '1px solid var(--night-3)'
    }
  }[variant] || {};
  const hoverStyle = {
    ghost: {
      background: 'var(--surface-hover)',
      color: 'var(--text-strong)'
    },
    outline: {
      background: 'var(--surface-hover)',
      color: 'var(--text-strong)'
    },
    night: {
      background: 'var(--night-3)',
      color: 'var(--starlight)'
    }
  }[variant];
  const activeStyle = active ? variant === 'night' ? {
    background: 'var(--night-3)',
    color: 'var(--starlight)'
  } : {
    background: 'var(--accent-tint)',
    color: 'var(--accent)',
    borderColor: 'transparent'
  } : null;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dims,
      height: dims,
      borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast)',
      ...base,
      ...(hover && !disabled && !active ? hoverStyle : null),
      ...activeStyle,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/PhaseTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos PhaseTag — the signature semantic chip for an idea's phase.
 * divergent → convergent → operational. Also handles generic status tones.
 * Style: pill, soft tint fill, a leading dot, mono-ish label in sans.
 */
function PhaseTag({
  phase = 'divergent',
  size = 'md',
  dot = true,
  children,
  style = {},
  ...rest
}) {
  const tones = {
    divergent: {
      fg: 'var(--divergent-3)',
      bg: 'var(--divergent-0)',
      dotc: 'var(--divergent-2)'
    },
    convergent: {
      fg: 'var(--convergent-3)',
      bg: 'var(--convergent-0)',
      dotc: 'var(--convergent-2)'
    },
    operational: {
      fg: 'var(--operational-3)',
      bg: 'var(--operational-0)',
      dotc: 'var(--operational-2)'
    },
    neutral: {
      fg: 'var(--ink-2)',
      bg: 'var(--paper-1)',
      dotc: 'var(--ink-3)'
    },
    vetted: {
      fg: 'var(--operational-3)',
      bg: 'var(--operational-0)',
      dotc: 'var(--operational-2)'
    },
    proposal: {
      fg: 'var(--convergent-3)',
      bg: 'var(--convergent-0)',
      dotc: 'var(--convergent-2)'
    }
  };
  const t = tones[phase] || tones.neutral;
  const dims = size === 'sm' ? {
    h: 20,
    px: 8,
    fs: 11,
    gap: 5,
    d: 6
  } : {
    h: 24,
    px: 10,
    fs: 12,
    gap: 6,
    d: 7
  };
  const label = children || phase.charAt(0).toUpperCase() + phase.slice(1);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: dims.gap,
      height: dims.h,
      padding: `0 ${dims.px}px`,
      background: t.bg,
      color: t.fg,
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-sans)',
      fontSize: dims.fs,
      fontWeight: 600,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: dims.d,
      height: dims.d,
      borderRadius: '50%',
      background: t.dotc,
      flex: 'none'
    }
  }), label);
}
Object.assign(__ds_scope, { PhaseTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PhaseTag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * Phronos Dialog — modal sheet over a scrim. On phones it can present as a
 * bottom sheet (sheet prop). Composes a title, body (children), and a footer
 * action row. Controlled via open + onClose.
 */
function Dialog({
  open = false,
  onClose,
  title = null,
  description = null,
  footer = null,
  sheet = false,
  children,
  width = 460
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: sheet ? 'flex-end' : 'center',
      justifyContent: 'center',
      padding: sheet ? 0 : 'var(--space-4)',
      background: 'rgba(16,18,22,0.42)',
      backdropFilter: 'blur(2px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      width: sheet ? '100%' : width,
      maxWidth: '100%',
      maxHeight: sheet ? '88vh' : '86vh',
      overflowY: 'auto',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: sheet ? 'var(--radius-xl) var(--radius-xl) 0 0' : 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      animation: `${sheet ? 'phSheetUp' : 'phDialogIn'} var(--dur-base) var(--ease-entrance)`
    }
  }, sheet && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      paddingTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 38,
      height: 4,
      borderRadius: 999,
      background: 'var(--paper-3)'
    }
  })), (title || description) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 8px'
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 20,
      fontWeight: 600,
      color: 'var(--text-strong)',
      letterSpacing: '-0.01em'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      color: 'var(--text-muted)',
      marginTop: 4,
      lineHeight: 1.5
    }
  }, description)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '8px 20px 16px'
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 10,
      padding: '14px 20px',
      borderTop: '1px solid var(--border-hairline)'
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, `@keyframes phDialogIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}@keyframes phSheetUp{from{transform:translateY(100%)}to{transform:none}}`));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/**
 * Phronos Toast — transient confirmation / status line. Carded, with a
 * tone-colored leading rule and optional action. Renders inline (mount it
 * wherever; positioning is the caller's job).
 */
function Toast({
  tone = 'neutral',
  title,
  children,
  action = null,
  onClose = null,
  style = {}
}) {
  const tones = {
    neutral: 'var(--ink-2)',
    positive: 'var(--operational-2)',
    caution: 'var(--convergent-2)',
    critical: 'var(--critical)',
    accent: 'var(--accent)'
  };
  const rule = tones[tone] || tones.neutral;
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      minWidth: 280,
      maxWidth: 420,
      padding: '13px 14px',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderLeft: `3px solid ${rule}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-strong)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-muted)',
      marginTop: title ? 2 : 0,
      lineHeight: 1.45
    }
  }, children)), action, onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Dismiss",
    style: {
      flex: 'none',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: 'var(--text-faint)',
      padding: 2,
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }))));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/**
 * Phronos Tooltip — ink bubble on hover/focus. CSS-free, JS-positioned
 * around the trigger. Wrap any element as children.
 */
function Tooltip({
  label,
  side = 'top',
  children,
  style = {}
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 8
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: 8
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: 8
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: 8
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      zIndex: 50,
      ...pos,
      whiteSpace: 'nowrap',
      padding: '5px 9px',
      background: 'var(--ink-0)',
      color: 'var(--starlight)',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 500,
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-md)',
      pointerEvents: 'none'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Checkbox — square check with the indigo accent. Pairs a label
 * and optional description; used for scope selection and filters.
 */
function Checkbox({
  checked = false,
  onChange,
  label = null,
  description = null,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const fieldId = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      display: 'flex',
      alignItems: description ? 'flex-start' : 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      flex: 'none',
      width: 18,
      height: 18,
      marginTop: description ? 2 : 0,
      borderRadius: 'var(--radius-xs)',
      background: checked ? 'var(--accent)' : 'var(--surface-card)',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
      transition: 'background var(--dur-fast), border-color var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      cursor: 'inherit'
    }
  }, rest)), checked && /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      position: 'absolute',
      top: 2,
      left: 2
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), (label || description) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-strong)',
      lineHeight: 1.3
    }
  }, label), description && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      color: 'var(--text-faint)',
      lineHeight: 1.4
    }
  }, description)));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Input — single-line text field. Hairline border, indigo focus
 * ring, optional leading icon and inline label/hint. Reads on parchment.
 */
function Input({
  label = null,
  hint = null,
  error = null,
  iconLeft = null,
  size = 'md',
  type = 'text',
  style = {},
  inputStyle = {},
  id,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = {
    sm: 36,
    md: 42,
    lg: 48
  }[size] || 42;
  const fieldId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--critical)' : focus ? 'var(--accent)' : 'var(--border-strong)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height: h,
      padding: '0 12px',
      background: 'var(--surface-card)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? `0 0 0 3px var(--focus-ring)` : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)'
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--text-faint)',
      flex: 'none'
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: type,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--text-strong)',
      ...inputStyle
    }
  }, rest))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: error ? 'var(--critical)' : 'var(--text-faint)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Select — native dropdown wrapped in brand chrome with a
 * chevron. Keeps keyboard + mobile behaviour of the native control.
 */
function Select({
  label = null,
  hint = null,
  size = 'md',
  options = [],
  children,
  style = {},
  id,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = {
    sm: 36,
    md: 42,
    lg: 48
  }[size] || 42;
  const fieldId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: h,
      background: 'var(--surface-card)',
      border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? '0 0 0 3px var(--focus-ring)' : 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: '100%',
      padding: '0 36px 0 12px',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      color: 'var(--text-strong)',
      cursor: 'pointer'
    }
  }, rest), options.length ? options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const lab = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  }) : children), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--text-faint)",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      position: 'absolute',
      right: 11,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Switch — binary toggle for settings (e.g. constrain-to-scope,
 * local-model seam). Indigo track when on; quiet motion.
 */
function Switch({
  checked = false,
  onChange,
  label = null,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const fieldId = id || (label ? `sw-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 38,
      height: 22,
      flex: 'none',
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--accent)' : 'var(--paper-3)',
      transition: 'background var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      cursor: 'inherit'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 18 : 2,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-xs)',
      transition: 'left var(--dur-base) var(--ease-standard)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 500,
      color: 'var(--text-strong)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Phronos Textarea — multi-line notes field. Same chrome as Input;
 * notes are the embedding corpus, so this gets generous line-height.
 */
function Textarea({
  label = null,
  hint = null,
  rows = 4,
  style = {},
  id,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fieldId = id || (label ? `ta-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-body)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: fieldId,
    rows: rows,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      padding: '10px 12px',
      background: 'var(--surface-card)',
      border: `1px solid ${focus ? 'var(--accent)' : 'var(--border-strong)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focus ? '0 0 0 3px var(--focus-ring)' : 'none',
      fontFamily: 'var(--font-sans)',
      fontSize: 15,
      lineHeight: 'var(--leading-relaxed)',
      color: 'var(--text-strong)',
      resize: 'vertical',
      outline: 'none',
      transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)'
    }
  }, rest)), hint && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      color: 'var(--text-faint)'
    }
  }, hint));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/graph/NodeChip.jsx
try { (() => {
/**
 * Phronos NodeChip — a single idea node as a selectable row/chip. Shows a
 * phase dot, label, optional metadata (refs/notes), and selection state.
 * The atom that lists, outlines, and scope pickers are built from.
 */
function NodeChip({
  label,
  phase = 'divergent',
  meta = null,
  selected = false,
  supernode = false,
  onClick,
  trailing = null,
  style = {}
}) {
  const [hover, setHover] = React.useState(false);
  const dotc = {
    divergent: 'var(--divergent-2)',
    convergent: 'var(--convergent-2)',
    operational: 'var(--operational-2)'
  }[phase] || 'var(--ink-3)';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 11px',
      borderRadius: 'var(--radius-sm)',
      cursor: onClick ? 'pointer' : 'default',
      background: selected ? 'var(--accent-tint)' : hover && onClick ? 'var(--surface-hover)' : 'transparent',
      border: `1px solid ${selected ? 'var(--indigo-2)' : 'transparent'}`,
      transition: 'background var(--dur-fast), border-color var(--dur-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      flex: 'none',
      width: 10,
      height: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: supernode ? 3 : '50%',
      background: dotc,
      boxShadow: supernode ? `0 0 0 2px var(--surface-card), 0 0 0 3px ${dotc}` : 'none'
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: supernode ? 600 : 500,
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, label), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, meta)), trailing);
}
Object.assign(__ds_scope, { NodeChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/graph/NodeChip.jsx", error: String((e && e.message) || e) }); }

// components/graph/ReviewCard.jsx
try { (() => {
/**
 * Phronos ReviewCard — one item in the unified review queue (Zotero match,
 * RAG synthesis, or sheet import). Shows source, an uncertainty meter,
 * the proposed content, and accept / edit / reject actions.
 */
function ReviewCard({
  source = 'rag',
  title,
  excerpt = null,
  uncertainty = 0.3,
  onAccept,
  onEdit,
  onReject,
  style = {}
}) {
  const sources = {
    rag: {
      label: 'RAG synthesis',
      icon: 'sparkles'
    },
    zotero: {
      label: 'Zotero match',
      icon: 'book-marked'
    },
    sheet: {
      label: 'Sheet import',
      icon: 'table'
    }
  };
  const s = sources[source] || sources.rag;
  const pct = Math.round(uncertainty * 100);
  const meterColor = uncertainty > 0.6 ? 'var(--critical)' : uncertainty > 0.35 ? 'var(--convergent-2)' : 'var(--operational-2)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      color: 'var(--accent)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": s.icon,
    style: {
      width: 15,
      height: 15
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)'
    }
  }, s.label), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 7
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-faint)'
    }
  }, "uncertainty"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 54,
      height: 5,
      borderRadius: 999,
      background: 'var(--paper-2)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      height: '100%',
      width: `${pct}%`,
      background: meterColor,
      borderRadius: 999
    }
  })))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 17,
      fontWeight: 600,
      color: 'var(--text-strong)',
      lineHeight: 1.3
    }
  }, title), excerpt && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13.5,
      color: 'var(--text-muted)',
      marginTop: 5,
      lineHeight: 1.55
    }
  }, excerpt)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      paddingTop: 2
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onAccept,
    style: btn('accept')
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "check",
    style: {
      width: 15,
      height: 15
    }
  }), " Accept"), /*#__PURE__*/React.createElement("button", {
    onClick: onEdit,
    style: btn('edit')
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "pencil",
    style: {
      width: 14,
      height: 14
    }
  }), " Edit"), /*#__PURE__*/React.createElement("button", {
    onClick: onReject,
    style: btn('reject')
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    style: {
      width: 15,
      height: 15
    }
  }), " Reject")));
}
function btn(kind) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    height: 38,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 13.5,
    fontWeight: 600,
    border: '1px solid transparent',
    transition: 'background var(--dur-fast)'
  };
  if (kind === 'accept') return {
    ...base,
    background: 'var(--operational-2)',
    color: '#fff'
  };
  if (kind === 'reject') return {
    ...base,
    background: 'transparent',
    color: 'var(--critical)',
    border: '1px solid var(--border-hairline)'
  };
  return {
    ...base,
    background: 'var(--surface-card)',
    color: 'var(--text-body)',
    border: '1px solid var(--border-strong)'
  };
}
Object.assign(__ds_scope, { ReviewCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/graph/ReviewCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SegmentedControl.jsx
try { (() => {
/**
 * Phronos SegmentedControl — compact mutually-exclusive switch, used for
 * graph filters (phase / tier / context) and small view toggles. A sliding
 * indigo-tinted thumb sits behind the active segment.
 */
function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md',
  style = {}
}) {
  const vals = options.map(o => typeof o === 'string' ? o : o.value);
  const [internal, setInternal] = React.useState(vals[0]);
  const active = value !== undefined ? value : internal;
  const idx = Math.max(0, vals.indexOf(active));
  const select = v => {
    setInternal(v);
    onChange && onChange(v);
  };
  const h = size === 'sm' ? 30 : 36;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      padding: 3,
      background: 'var(--paper-1)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      height: h,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: `calc(3px + ${idx} * (100% - 6px) / ${vals.length})`,
      width: `calc((100% - 6px) / ${vals.length})`,
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-xs)',
      transition: 'left var(--dur-base) var(--ease-standard)'
    }
  }), options.map(o => {
    const val = typeof o === 'string' ? o : o.value;
    const label = typeof o === 'string' ? o : o.label;
    const isActive = val === active;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      onClick: () => select(val),
      style: {
        position: 'relative',
        zIndex: 1,
        flex: 1,
        padding: '0 14px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: size === 'sm' ? 12.5 : 13.5,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--text-strong)' : 'var(--text-faint)',
        whiteSpace: 'nowrap',
        transition: 'color var(--dur-fast)'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Phronos Tabs — underline tab bar for switching views (Graph / Outline /
 * References / Review). Controlled via value + onChange.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {}
}) {
  const [internal, setInternal] = React.useState(tabs[0] && (tabs[0].value || tabs[0]));
  const active = value !== undefined ? value : internal;
  const select = v => {
    setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-hairline)',
      ...style
    }
  }, tabs.map(t => {
    const val = t.value || t;
    const label = t.label || t;
    const count = t.count;
    const isActive = val === active;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": isActive,
      onClick: () => select(val),
      style: {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 12px',
        marginBottom: -1,
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: isActive ? 600 : 500,
        color: isActive ? 'var(--text-strong)' : 'var(--text-faint)',
        transition: 'color var(--dur-fast), border-color var(--dur-fast)'
      }
    }, label, count != null && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        fontWeight: 500,
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 'var(--radius-pill)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive ? 'var(--indigo-0)' : 'var(--paper-2)',
        color: isActive ? 'var(--indigo-4)' : 'var(--text-faint)'
      }
    }, count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/App.jsx
try { (() => {
/* Phronos mobile PWA shell — bottom tab bar switches the four surfaces. */
function MobileApp() {
  const [tab, setTab] = React.useState('graph');
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  const tabs = [{
    id: 'graph',
    label: 'Graph',
    icon: 'git-fork'
  }, {
    id: 'outline',
    label: 'Outline',
    icon: 'list-tree'
  }, {
    id: 'brainstorm',
    label: 'Brainstorm',
    icon: 'sparkles'
  }, {
    id: 'review',
    label: 'Review',
    icon: 'inbox',
    badge: 4
  }];
  const Screen = {
    graph: window.GraphScreen,
    outline: window.OutlineScreen,
    brainstorm: window.BrainstormScreen,
    review: window.ReviewScreen
  }[tab];
  const dark = tab === 'graph';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      background: dark ? 'var(--night-1)' : 'var(--bg-page)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 30,
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      fontFamily: 'var(--font-sans)',
      fontSize: 12,
      fontWeight: 600,
      color: dark ? 'var(--starlight)' : 'var(--text-strong)',
      background: dark ? 'var(--night-1)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      gap: 5,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "signal",
    style: {
      width: 14,
      height: 14
    }
  }), /*#__PURE__*/React.createElement("i", {
    "data-lucide": "wifi",
    style: {
      width: 14,
      height: 14
    }
  }), /*#__PURE__*/React.createElement("i", {
    "data-lucide": "battery-full",
    style: {
      width: 18,
      height: 18
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      overflow: 'hidden'
    }
  }, Screen ? /*#__PURE__*/React.createElement(Screen, null) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 'none',
      height: 64,
      display: 'flex',
      alignItems: 'stretch',
      borderTop: `1px solid ${dark ? 'var(--night-3)' : 'var(--border-hairline)'}`,
      background: dark ? 'var(--night-2)' : 'var(--surface-card)'
    }
  }, tabs.map(t => {
    const active = tab === t.id;
    const color = active ? dark ? 'var(--starlight)' : 'var(--accent)' : dark ? 'var(--starlight-2)' : 'var(--text-faint)';
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      onClick: () => setTab(t.id),
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        position: 'relative',
        paddingTop: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": t.icon,
      style: {
        width: 21,
        height: 21,
        color
      }
    }), t.badge && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -5,
        right: -8,
        minWidth: 15,
        height: 15,
        padding: '0 4px',
        background: 'var(--critical)',
        color: '#fff',
        borderRadius: 999,
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, t.badge)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 10.5,
        fontWeight: active ? 600 : 500,
        color
      }
    }, t.label));
  })));
}
Object.assign(window, {
  MobileApp
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/BrainstormScreen.jsx
try { (() => {
/* Mobile brainstorm — pick a scope, write a prompt, queue a RAG run (FR-G3). */
function BrainstormScreen() {
  const {
    NodeChip,
    Textarea,
    Select,
    Switch,
    Button,
    PhaseTag
  } = window.PhronosDesignSystem_cf863b;
  const [scope, setScope] = React.useState(['research', 'corpus']);
  const [scoped, setScoped] = React.useState(true);
  const [queued, setQueued] = React.useState(false);
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  const scopeNodes = [{
    id: 'research',
    label: 'Research',
    phase: 'convergent',
    meta: 'supernode · 12 nodes',
    super: true
  }, {
    id: 'corpus',
    label: 'Embedding corpus',
    phase: 'convergent',
    meta: 'annotations'
  }, {
    id: 'trails',
    label: 'Associative trails',
    phase: 'divergent',
    meta: '2 refs'
  }];
  const toggle = id => setScope(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Brainstorm",
    subtitle: "Scoped retrieval \xB7 human-gated output"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '4px 16px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionLabel, null, "Scope \xB7 ", scope.length, " selected"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-lg)',
      padding: 6,
      boxShadow: 'var(--shadow-xs)'
    }
  }, scopeNodes.map(n => /*#__PURE__*/React.createElement(NodeChip, {
    key: n.id,
    label: n.label,
    phase: n.phase,
    meta: n.meta,
    supernode: n.super,
    selected: scope.includes(n.id),
    onClick: () => toggle(n.id),
    trailing: scope.includes(n.id) ? /*#__PURE__*/React.createElement("i", {
      "data-lucide": "check",
      style: {
        width: 16,
        height: 16,
        color: 'var(--accent)'
      }
    }) : /*#__PURE__*/React.createElement("i", {
      "data-lucide": "circle",
      style: {
        width: 16,
        height: 16,
        color: 'var(--ink-4)'
      }
    })
  })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionLabel, null, "Prompt"), /*#__PURE__*/React.createElement(Textarea, {
    rows: 4,
    defaultValue: "How might associative trails change how references are matched to early-stage nodes?"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(SectionLabel, null, "Model"), /*#__PURE__*/React.createElement(Select, {
    options: ['claude-opus', 'claude-sonnet', 'local (later)']
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-hairline)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    checked: scoped,
    onChange: e => setScoped(e.target.checked),
    label: "Constrain retrieval to scope"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "shield-check",
    style: {
      width: 15,
      height: 15,
      color: 'var(--operational-2)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 12.5,
      color: 'var(--text-muted)'
    }
  }, "Output enters the review queue \u2014 never the graph directly.")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      borderTop: '1px solid var(--border-hairline)',
      background: 'var(--surface-card)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    full: true,
    size: "lg",
    variant: queued ? 'secondary' : 'primary',
    onClick: () => setQueued(true),
    iconLeft: /*#__PURE__*/React.createElement("i", {
      "data-lucide": queued ? 'check' : 'sparkles',
      style: {
        width: 17,
        height: 17
      }
    })
  }, queued ? 'Queued — runs asynchronously' : 'Queue brainstorm')));
}
function SectionLabel({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10.5,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--text-faint)',
      margin: '0 0 8px 2px'
    }
  }, children);
}
Object.assign(window, {
  BrainstormScreen,
  SectionLabel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/BrainstormScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Constellation.jsx
try { (() => {
/* Shared idea-graph data + the constellation canvas renderer.
   Coordinates are 0–100 (percent) so the SVG scales to any box. */
const PHRONOS_GRAPH = {
  nodes: [{
    id: 'research',
    label: 'Research',
    phase: 'convergent',
    x: 30,
    y: 30,
    r: 13,
    super: true
  }, {
    id: 'trails',
    label: 'Associative trails',
    phase: 'divergent',
    x: 14,
    y: 17,
    r: 7
  }, {
    id: 'corpus',
    label: 'Embedding corpus',
    phase: 'convergent',
    x: 46,
    y: 14,
    r: 8
  }, {
    id: 'zotero',
    label: 'Zotero mirror',
    phase: 'divergent',
    x: 20,
    y: 46,
    r: 7
  }, {
    id: 'library',
    label: 'Library infra',
    phase: 'operational',
    x: 70,
    y: 34,
    r: 12,
    super: true
  }, {
    id: 'seam',
    label: 'Self-hosting seam',
    phase: 'operational',
    x: 84,
    y: 20,
    r: 8
  }, {
    id: 'cost',
    label: 'Scale-to-zero',
    phase: 'operational',
    x: 86,
    y: 52,
    r: 7
  }, {
    id: 'sim',
    label: 'Simulation',
    phase: 'divergent',
    x: 52,
    y: 70,
    r: 9,
    super: true
  }, {
    id: 'rubric',
    label: 'Eval rubric',
    phase: 'divergent',
    x: 36,
    y: 84,
    r: 6
  }, {
    id: 'branch',
    label: 'Sim branches',
    phase: 'convergent',
    x: 70,
    y: 80,
    r: 7
  }, {
    id: 'personal',
    label: 'Personal',
    phase: 'divergent',
    x: 22,
    y: 68,
    r: 7
  }],
  edges: [['research', 'trails', 'hier'], ['research', 'corpus', 'hier'], ['research', 'zotero', 'lat'], ['library', 'seam', 'hier'], ['library', 'cost', 'hier'], ['research', 'library', 'lat'], ['sim', 'rubric', 'hier'], ['sim', 'branch', 'hier'], ['sim', 'library', 'lat'], ['personal', 'research', 'lat'], ['corpus', 'library', 'lat']]
};
const PHASE_COLOR = {
  divergent: '#6E81DC',
  convergent: '#CF9A3E',
  operational: '#3E8E6B'
};
function Constellation({
  data = PHRONOS_GRAPH,
  selected = [],
  onSelect = null,
  showLabels = true,
  compact = false
}) {
  const byId = Object.fromEntries(data.nodes.map(n => [n.id, n]));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 100 100",
    preserveAspectRatio: "none",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "phGlow",
    cx: "50%",
    cy: "40%",
    r: "70%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "#1b2030"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "#0E1016"
  }))), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "100",
    height: "100",
    fill: "url(#phGlow)"
  }), data.edges.map(([a, b, kind], i) => {
    const na = byId[a];
    const nb = byId[b];
    const sel = selected.includes(a) || selected.includes(b);
    return /*#__PURE__*/React.createElement("line", {
      key: i,
      x1: na.x,
      y1: na.y,
      x2: nb.x,
      y2: nb.y,
      stroke: sel ? '#8C92E0' : '#3A4151',
      strokeWidth: kind === 'lat' ? 0.25 : 0.4,
      strokeDasharray: kind === 'lat' ? '1.2 1' : 'none',
      strokeOpacity: sel ? 0.9 : 0.55,
      vectorEffect: "non-scaling-stroke"
    });
  })), data.nodes.map(n => {
    const isSel = selected.includes(n.id);
    const c = PHASE_COLOR[n.phase];
    const size = (compact ? 0.7 : 1) * n.r;
    return /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => onSelect && onSelect(n.id),
      style: {
        position: 'absolute',
        left: `${n.x}%`,
        top: `${n.y}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: 'none',
        border: 'none',
        cursor: onSelect ? 'pointer' : 'default',
        padding: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: size * 2,
        height: size * 2,
        borderRadius: n.super ? '30%' : '50%',
        background: c,
        boxShadow: isSel ? `0 0 0 2px #0E1016, 0 0 0 3.5px ${c}, 0 0 16px ${c}` : `0 0 0 1px rgba(255,255,255,0.12), 0 0 10px ${c}66`,
        transition: 'box-shadow 160ms ease, transform 160ms ease',
        transform: isSel ? 'scale(1.12)' : 'scale(1)'
      }
    }), showLabels && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-sans)',
        fontSize: 9.5,
        fontWeight: isSel ? 600 : 500,
        color: isSel ? '#E8EAF2' : '#A6ABBC',
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        letterSpacing: '0.01em'
      }
    }, n.label));
  }));
}
Object.assign(window, {
  Constellation,
  PHRONOS_GRAPH,
  PHASE_COLOR
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Constellation.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/GraphScreen.jsx
try { (() => {
/* Mobile graph view — the constellation on the night canvas. */
function GraphScreen() {
  const {
    SegmentedControl,
    IconButton,
    PhaseTag,
    Badge
  } = window.PhronosDesignSystem_cf863b;
  const [filter, setFilter] = React.useState('All');
  const [sel, setSel] = React.useState('seam');
  const node = PHRONOS_GRAPH.nodes.find(n => n.id === sel);
  const visible = filter === 'All' ? PHRONOS_GRAPH : {
    ...PHRONOS_GRAPH,
    nodes: PHRONOS_GRAPH.nodes.filter(n => n.phase === filter.toLowerCase()),
    edges: PHRONOS_GRAPH.edges.filter(([a, b]) => {
      const ph = filter.toLowerCase();
      const byId = Object.fromEntries(PHRONOS_GRAPH.nodes.map(n => [n.id, n]));
      return byId[a].phase === ph && byId[b].phase === ph;
    })
  };
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--night-1)'
    }
  }, /*#__PURE__*/React.createElement(Constellation, {
    data: visible,
    selected: [sel],
    onSelect: setSel
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '14px 16px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'linear-gradient(180deg, rgba(14,16,22,0.92), rgba(14,16,22,0))'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/phronos-mark.svg",
    width: "24",
    height: "24",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 18,
      fontWeight: 600,
      color: 'var(--starlight)',
      flex: 1
    }
  }, "Constellation"), /*#__PURE__*/React.createElement(IconButton, {
    label: "Search",
    variant: "night"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 56,
      left: 16,
      right: 16
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    size: "sm",
    value: filter,
    onChange: setFilter,
    options: ['All', 'Divergent', 'Convergent', 'Operational'],
    style: {
      background: 'var(--night-2)',
      borderColor: 'var(--night-3)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 16,
      bottom: node ? 188 : 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    label: "Zoom in",
    variant: "night"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus"
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Zoom out",
    variant: "night"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "minus"
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Fit",
    variant: "night"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "maximize"
  }))), node && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
      background: 'var(--night-2)',
      border: '1px solid var(--night-3)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(PhaseTag, {
    phase: node.phase,
    size: "sm"
  }), node.super && /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    variant: "outline",
    style: {
      color: 'var(--starlight-2)',
      borderColor: 'var(--night-4)'
    }
  }, "supernode"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--starlight-2)'
    }
  }, "node_", node.id.slice(0, 4))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 21,
      fontWeight: 600,
      color: 'var(--starlight)',
      letterSpacing: '-0.01em'
    }
  }, node.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--starlight-2)',
      marginTop: 4
    }
  }, "3 references \xB7 2 notes \xB7 4 cross-links"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: nightBtn(true)
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "sparkles",
    style: {
      width: 15,
      height: 15
    }
  }), " Brainstorm"), /*#__PURE__*/React.createElement("button", {
    style: nightBtn(false)
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "pen-line",
    style: {
      width: 15,
      height: 15
    }
  }), " Edit"))));
}
function nightBtn(primary) {
  return {
    flex: 1,
    height: 42,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    fontWeight: 600,
    background: primary ? 'var(--indigo-3)' : 'transparent',
    color: primary ? '#fff' : 'var(--starlight)',
    border: primary ? '1px solid var(--indigo-3)' : '1px solid var(--night-4)'
  };
}
Object.assign(window, {
  GraphScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/GraphScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/OutlineScreen.jsx
try { (() => {
/* Mobile outline editor — add / edit nodes & edges from the phone (FR-G2). */
function OutlineScreen() {
  const {
    NodeChip,
    Badge,
    Button,
    Tabs
  } = window.PhronosDesignSystem_cf863b;
  const [sel, setSel] = React.useState('seam');
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  const outline = [{
    id: 'research',
    label: 'Research',
    phase: 'convergent',
    meta: '12 nodes',
    super: true,
    depth: 0
  }, {
    id: 'trails',
    label: 'Associative trails',
    phase: 'divergent',
    meta: '2 refs',
    depth: 1
  }, {
    id: 'corpus',
    label: 'Embedding corpus',
    phase: 'convergent',
    meta: 'annotations',
    depth: 1
  }, {
    id: 'library',
    label: 'Library infra',
    phase: 'operational',
    meta: '8 nodes',
    super: true,
    depth: 0
  }, {
    id: 'seam',
    label: 'Self-hosting seam',
    phase: 'operational',
    meta: '3 refs · 2 notes',
    depth: 1
  }, {
    id: 'cost',
    label: 'Scale-to-zero',
    phase: 'operational',
    meta: '1 ref',
    depth: 1
  }, {
    id: 'sim',
    label: 'Simulation',
    phase: 'divergent',
    meta: '3 nodes',
    super: true,
    depth: 0
  }, {
    id: 'rubric',
    label: 'Eval rubric',
    phase: 'divergent',
    meta: 'open question',
    depth: 1
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Outline",
    trailing: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "plus",
        style: {
          width: 15,
          height: 15
        }
      })
    }, "Node")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px'
    }
  }, /*#__PURE__*/React.createElement(Tabs, {
    tabs: ['Outline', 'Edges'],
    value: "Outline",
    onChange: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '10px 12px 16px'
    }
  }, outline.map(n => /*#__PURE__*/React.createElement("div", {
    key: n.id,
    style: {
      paddingLeft: n.depth * 18
    }
  }, /*#__PURE__*/React.createElement(NodeChip, {
    label: n.label,
    phase: n.phase,
    meta: n.meta,
    supernode: n.super,
    selected: sel === n.id,
    onClick: () => setSel(n.id),
    trailing: n.super ? /*#__PURE__*/React.createElement(Badge, {
      tone: "accent"
    }, n.meta.split(' ')[0]) : /*#__PURE__*/React.createElement("i", {
      "data-lucide": "grip-vertical",
      style: {
        width: 16,
        height: 16,
        color: 'var(--ink-4)'
      }
    })
  })))));
}
function ScreenHeader({
  title,
  trailing = null,
  subtitle = null
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 24,
      fontWeight: 600,
      color: 'var(--text-strong)',
      letterSpacing: '-0.01em'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-faint)',
      marginTop: 1
    }
  }, subtitle)), trailing);
}
Object.assign(window, {
  OutlineScreen,
  ScreenHeader
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/OutlineScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ReviewScreen.jsx
try { (() => {
/* Mobile review queue — the single accept/edit/reject surface (FR-E4). */
function ReviewScreen() {
  const {
    ReviewCard,
    SegmentedControl,
    Toast
  } = window.PhronosDesignSystem_cf863b;
  const [src, setSrc] = React.useState('All');
  const [toast, setToast] = React.useState(null);
  React.useEffect(() => {
    window.lucide && window.lucide.createIcons();
  });
  const items = [{
    id: 1,
    source: 'zotero',
    title: 'Bush, V. — As We May Think',
    excerpt: 'Proposed link to “Associative trails” with abstract attached as context.',
    uncertainty: 0.78
  }, {
    id: 2,
    source: 'rag',
    title: 'Scale-to-zero is defeated by a held-open pool',
    excerpt: 'Synthesis suggests a new operational node under “Library infra”.',
    uncertainty: 0.46
  }, {
    id: 3,
    source: 'sheet',
    title: 'Eval rubric · 3 scored dimensions',
    excerpt: 'Row keyed to node_rubr proposes operational fields from the planning sheet.',
    uncertainty: 0.31
  }, {
    id: 4,
    source: 'zotero',
    title: 'Engelbart — Augmenting Human Intellect',
    excerpt: 'Candidate match to “Personal”; confidence low on sparse node.',
    uncertainty: 0.64
  }];
  const filtered = src === 'All' ? items : items.filter(i => i.source === src.toLowerCase());
  const fire = verb => setToast(verb);
  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2400);
      return () => clearTimeout(t);
    }
  }, [toast]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--bg-page)',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Review",
    subtitle: `${filtered.length} proposals · most uncertain first`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px 10px'
    }
  }, /*#__PURE__*/React.createElement(SegmentedControl, {
    size: "sm",
    value: src,
    onChange: setSrc,
    options: ['All', 'Zotero', 'RAG', 'Sheet']
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '6px 16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, filtered.sort((a, b) => b.uncertainty - a.uncertainty).map(i => /*#__PURE__*/React.createElement(ReviewCard, {
    key: i.id,
    source: i.source,
    title: i.title,
    excerpt: i.excerpt,
    uncertainty: i.uncertainty,
    onAccept: () => fire('Accepted — published with provenance'),
    onEdit: () => fire('Opened for editing'),
    onReject: () => fire('Rejected — nothing written')
  }))), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12
    }
  }, /*#__PURE__*/React.createElement(Toast, {
    tone: toast.startsWith('Rejected') ? 'critical' : toast.startsWith('Accepted') ? 'positive' : 'accent',
    title: toast,
    style: {
      maxWidth: 'none'
    }
  })));
}
Object.assign(window, {
  ReviewScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ReviewScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.PhaseTag = __ds_scope.PhaseTag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.NodeChip = __ds_scope.NodeChip;

__ds_ns.ReviewCard = __ds_scope.ReviewCard;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
