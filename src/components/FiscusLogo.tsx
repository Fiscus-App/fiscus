/**
 * FiscusLogo — brand mark used on auth pages and loading states.
 * Renders the app-icon (4 ascending gold bars + trend line) + gradient wordmark.
 */
export function FiscusLogo({ showTagline = false }: { showTagline?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Icon mark */}
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(145deg, #0d1528, #07091a)',
        border: '1px solid rgba(232,184,75,0.35)',
        boxShadow: '0 0 32px rgba(232,184,75,0.18), inset 0 1px 0 rgba(232,184,75,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 80%, rgba(232,184,75,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Ascending bars SVG */}
        <svg width="34" height="28" viewBox="0 0 34 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fl-bar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f5cc5a" />
              <stop offset="100%" stopColor="#d4a438" />
            </linearGradient>
          </defs>
          {/* Bar 1 */}
          <rect x="1"  y="20" width="5" height="7" rx="1.5" fill="url(#fl-bar-grad)" opacity="0.38" />
          {/* Bar 2 */}
          <rect x="10" y="14" width="5" height="13" rx="1.5" fill="url(#fl-bar-grad)" opacity="0.58" />
          {/* Bar 3 */}
          <rect x="19" y="8"  width="5" height="19" rx="1.5" fill="url(#fl-bar-grad)" opacity="0.80" />
          {/* Bar 4 */}
          <rect x="28" y="1"  width="5" height="26" rx="1.5" fill="url(#fl-bar-grad)" opacity="1.00" />
          {/* Trend line connecting bar tops */}
          <polyline
            points="3.5,19 12.5,13 21.5,7 30.5,0.5"
            stroke="#e8b84b"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="2.2 2.2"
            opacity="0.65"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <span style={{
        fontSize: 26,
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 55%, #d4a438 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Fiscus
      </span>

      {showTagline && (
        <span style={{
          fontSize: 11,
          fontFamily: 'ui-monospace, "SF Mono", monospace',
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
        }}>
          Australian Financial Intelligence
        </span>
      )}
    </div>
  )
}
