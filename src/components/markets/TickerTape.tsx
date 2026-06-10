'use client'

interface TickerItem {
  label: string
  value: string
  change: number | null
}

const ITEMS: TickerItem[] = [
  { label: 'ASX 200', value: '8,142.3', change: -0.43 },
  { label: 'AUD/USD', value: '0.6412', change: -0.23 },
  { label: 'BHP', value: '44.82', change: -2.30 },
  { label: 'CBA', value: '162.40', change: 1.20 },
  { label: 'RIO', value: '118.40', change: 1.95 },
  { label: 'WDS', value: '24.12', change: 2.81 },
  { label: 'Gold', value: '3,298', change: 0.42 },
  { label: 'Iron Ore', value: '102.4', change: -1.80 },
  { label: 'WTI Oil', value: '68.30', change: -0.72 },
  { label: 'AUD/CNY', value: '4.6523', change: -0.18 },
  { label: 'RBA Cash Rate', value: '4.10%', change: null },
  { label: '10Y Bond', value: '4.28%', change: null },
  { label: 'Nikkei 225', value: '38,421', change: -1.12 },
  { label: 'S&P 500', value: '5,648.2', change: 0.24 },
]

export function TickerTape() {
  const doubled = [...ITEMS, ...ITEMS]

  return (
    <div
      className="overflow-hidden whitespace-nowrap flex-shrink-0"
      style={{
        height: 27,
        background: 'rgba(8,11,26,0.97)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="ticker-inner inline-flex items-center h-full">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 mr-6 font-mono text-[11px]"
          >
            <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
            <span className="font-medium">{item.value}</span>
            {item.change != null && (
              <span
                style={{
                  color: item.change >= 0 ? 'var(--green)' : 'var(--red)',
                }}
              >
                {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
              </span>
            )}
            <span style={{ color: 'var(--text-faint)', marginLeft: 10 }}>|</span>
          </span>
        ))}
      </div>
    </div>
  )
}
