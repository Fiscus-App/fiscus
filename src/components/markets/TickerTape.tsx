'use client'

import { useEffect, useState } from 'react'

interface TickerItem {
  label:  string
  value:  string
  change: number | null
}

const LOADING_ITEMS: TickerItem[] = [
  { label: 'ASX 200',  value: '···', change: null },
  { label: 'S&P 500',  value: '···', change: null },
  { label: 'AUD/USD',  value: '···', change: null },
  { label: 'Gold',     value: '···', change: null },
  { label: 'CBA',      value: '···', change: null },
  { label: 'BHP',      value: '···', change: null },
  { label: 'RIO',      value: '···', change: null },
  { label: 'AUD/JPY',  value: '···', change: null },
  { label: 'RBA Rate', value: '4.10%', change: null },
]

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return '···'
  return n.toLocaleString('en-AU', {
    minimumFractionDigits:  decimals,
    maximumFractionDigits:  decimals,
  })
}

// ── Browser-side Yahoo Finance fallback ──────────────────────────────────────
// Used when the Edge route (/api/market/stocks) returns source: 'none'.

const YF_STOCKS  = ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX']
const YF_INDICES = ['^AXJO', '^GSPC', '^N225', '^FTSE']

interface YFQuote {
  symbol: string
  regularMarketPrice: number
  regularMarketChangePercent: number
}

async function fetchYahooFromBrowser(): Promise<{
  topMovers: { ticker: string; price: number; change: number }[]
  indices:   { name: string; value: number; change: number }[]
  asx?:      { price: number; change: number }
} | null> {
  const syms = [...YF_STOCKS, ...YF_INDICES].join(',')
  const INDEX_NAMES: Record<string, string> = {
    '^AXJO': 'ASX 200', '^GSPC': 'S&P 500', '^N225': 'Nikkei', '^FTSE': 'FTSE 100',
  }

  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const url = `https://${host}/v7/finance/quote?symbols=${syms}&lang=en-US&region=AU`
      const res = await fetch(url, { headers: { 'Accept': 'application/json, */*' } })
      if (!res.ok) continue

      const data = await res.json() as { quoteResponse?: { result?: YFQuote[] } }
      const results = data?.quoteResponse?.result ?? []
      if (results.length === 0) continue

      const bySymbol = new Map(results.map((r) => [r.symbol, r]))

      const topMovers = YF_STOCKS
        .map((sym) => {
          const q = bySymbol.get(sym)
          return q ? { ticker: sym.replace('.AX', ''), price: q.regularMarketPrice, change: q.regularMarketChangePercent } : null
        })
        .filter((x): x is { ticker: string; price: number; change: number } => x !== null)

      const indices = YF_INDICES
        .map((sym) => {
          const q = bySymbol.get(sym)
          return q ? { name: INDEX_NAMES[sym], value: q.regularMarketPrice, change: q.regularMarketChangePercent } : null
        })
        .filter((x): x is { name: string; value: number; change: number } => x !== null)

      const axjoQ = bySymbol.get('^AXJO')
      return {
        topMovers,
        indices,
        asx: axjoQ ? { price: axjoQ.regularMarketPrice, change: axjoQ.regularMarketChangePercent } : undefined,
      }
    } catch { /* try next host */ }
  }
  return null
}

// ── API response shapes ───────────────────────────────────────────────────────

interface SummaryResponse {
  asx?:         { price: number; change: number } | null
  indices?:     { name: string; value: number | null; change: number | null }[]
  fx?:          { pair: string; value: number | null; change: number | null }[]
  commodities?: { name: string; value: number | null; change: number | null }[]
  topMovers?:   { ticker: string; price: number | null; change: number | null }[]
}

interface StocksResponse {
  topMovers?: { ticker: string; price: number | null; change: number | null }[]
  indices?:   { name: string; value: number | null; change: number | null }[]
  asx?:       { price: number; change: number } | null
  source:     string
}

// ── Build tape items from combined data ───────────────────────────────────────

function buildItems(d: SummaryResponse): TickerItem[] {
  const items: TickerItem[] = []

  // ASX 200 hero price
  if (d.asx?.price) {
    items.push({ label: 'ASX 200', value: fmt(d.asx.price, 1), change: d.asx.change ?? null })
  }

  // Other global indices (skip ASX 200 — already added above)
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

  // Commodities (Gold, etc.)
  for (const c of d.commodities ?? []) {
    if (c.value !== null) {
      items.push({ label: c.name, value: `$${fmt(c.value, 0)}`, change: c.change })
    }
  }

  // Top ASX stocks (up to 5 by absolute change)
  for (const m of (d.topMovers ?? []).slice(0, 5)) {
    if (m.price !== null) {
      items.push({ label: m.ticker, value: `$${fmt(m.price)}`, change: m.change })
    }
  }

  // RBA cash rate (always shown — static until RBA changes it)
  items.push({ label: 'RBA Rate', value: '4.10%', change: null })

  return items.length >= 3 ? items : LOADING_ITEMS
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>(LOADING_ITEMS)

  useEffect(() => {
    async function load() {
      try {
        // Fetch FX/metals and stocks in parallel
        const [summaryRes, stocksRes] = await Promise.all([
          fetch('/api/market/summary'),
          fetch('/api/market/stocks'),
        ])

        let combined: SummaryResponse = {}

        if (summaryRes.ok) {
          combined = await summaryRes.json() as SummaryResponse
        }

        if (stocksRes.ok) {
          const stocks: StocksResponse = await stocksRes.json()
          if (stocks?.source !== 'none') {
            if (stocks.topMovers?.length) combined.topMovers = stocks.topMovers
            if (stocks.indices?.length)   combined.indices   = stocks.indices
            if (stocks.asx)               combined.asx       = stocks.asx
          }
        }

        // Browser-side fallback: user's IP not blocked by Yahoo Finance
        const missingStocks  = !(combined.topMovers ?? []).some((m) => m.price  !== null)
        const missingIndices = !(combined.indices  ?? []).some((i) => i.value !== null)
        if (missingStocks || missingIndices) {
          const yf = await fetchYahooFromBrowser()
          if (yf) {
            if (yf.topMovers.length) combined.topMovers = yf.topMovers
            if (yf.indices.length)   combined.indices   = yf.indices
            if (yf.asx)              combined.asx       = yf.asx
          }
        }

        const built = buildItems(combined)
        setItems(built)
      } catch {
        // keep loading state
      }
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
