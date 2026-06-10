'use client'

import { useEffect, useState } from 'react'

interface TickerItem {
  label:  string
  value:  string
  change: number | null
}

// Shown while loading or if API fails — no fake prices, just labels
const LOADING_ITEMS: TickerItem[] = [
  { label: 'ASX 200',      value: '···', change: null },
  { label: 'S&P 500',      value: '···', change: null },
  { label: 'AUD/USD',      value: '···', change: null },
  { label: 'Gold',         value: '···', change: null },
  { label: 'CBA',          value: '···', change: null },
  { label: 'BHP',          value: '···', change: null },
  { label: 'RIO',          value: '···', change: null },
  { label: 'WDS',          value: '···', change: null },
  { label: 'AUD/JPY',      value: '···', change: null },
  { label: 'RBA Rate',     value: '4.10%', change: null },
]

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return '···'
  return n.toLocaleString('en-AU', {
    minimumFractionDigits:  decimals,
    maximumFractionDigits:  decimals,
  })
}

interface SummaryResponse {
  asx?:        { price: number; change: number } | null
  indices?:    { name: string; value: number | null; change: number | null }[]
  fx?:         { pair: string; value: number | null; change: number | null }[]
  commodities?:{ name: string; value: number | null; change: number | null }[]
  topMovers?:  { ticker: string; price: number | null; change: number | null }[]
}

function buildItems(d: SummaryResponse): TickerItem[] {
  const items: TickerItem[] = []

  // ASX 200 hero
  if (d.asx?.price) {
    items.push({ label: 'ASX 200', value: fmt(d.asx.price, 1), change: d.asx.change ?? null })
  }

  // Other global indices (skip ASX 200 since already added)
  for (const idx of d.indices ?? []) {
    if (idx.name === 'ASX 200') continue
    if (idx.value !== null) {
      const decimals = idx.name === 'Nikkei' ? 0 : 1
      items.push({ label: idx.name, value: fmt(idx.value, decimals), change: idx.change })
    }
  }

  // FX
  for (const f of d.fx ?? []) {
    if (f.value !== null) {
      const decimals = f.pair.includes('JPY') ? 3 : 4
      items.push({ label: f.pair, value: fmt(f.value, decimals), change: f.change })
    }
  }

  // Commodities
  for (const c of d.commodities ?? []) {
    if (c.value !== null) {
      items.push({ label: c.name, value: `$${fmt(c.value, 0)}`, change: c.change })
    }
  }

  // Top movers (first 4 by absolute change)
  for (const m of (d.topMovers ?? []).slice(0, 4)) {
    if (m.price !== null) {
      items.push({ label: m.ticker, value: `$${fmt(m.price)}`, change: m.change })
    }
  }

  // Always include RBA cash rate (static — updated manually when RBA changes)
  items.push({ label: 'RBA Rate', value: '4.10%', change: null })

  return items.length >= 3 ? items : LOADING_ITEMS
}

export function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>(LOADING_ITEMS)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/market/summary')
        if (!res.ok) return
        const data: SummaryResponse = await res.json()
        const built = buildItems(data)
        setItems(built)
      } catch { /* keep loading state */ }
    }
    load()
    const id = setInterval(load, 5 * 60 * 1000)  // refresh every 5 min
    return () => clearInterval(id)
  }, [])

  const doubled = [...items, ...items]

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
            <span className="font-medium" style={{ color: item.value === '···' ? 'var(--text-faint)' : undefined }}>
              {item.value}
            </span>
            {item.change !== null && (
              <span style={{ color: item.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
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
