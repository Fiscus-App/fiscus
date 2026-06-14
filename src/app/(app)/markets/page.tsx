'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndexData  { name: string; value: number | null; change: number | null; changeAbs: number | null }
interface CommodData { name: string; unit: string; value: number | null; change: number | null }
interface FxData     { pair: string; value: number | null; change: number | null; source?: string | null }
interface MoverData  { ticker: string; name: string; price: number | null; change: number | null }
interface AsxData    { price: number; change: number; changeAbs: number }

interface MetaData {
  fetchedAt:          string
  hasAnyLive:         boolean
  hasLiveStocks:      boolean
  hasLiveFX:          boolean
  hasLiveIndices:     boolean
  hasLiveCommodities: boolean
  fxDate:             string | null
  dataSource?:        string
}

interface MarketSummary {
  indices:     IndexData[]
  commodities: CommodData[]
  fx:          FxData[]
  topMovers:   MoverData[]
  asx:         AsxData | null
  meta?:       MetaData
}

interface StocksResponse {
  topMovers: Array<{ ticker: string; name: string; price: number | null; change: number | null; changeAbs: number | null }>
  indices:   Array<{ name: string; value: number | null; change: number | null; changeAbs: number | null }>
  asx:       AsxData | null
  source:    string
  fetchedAt: string
}

// ── Fallback (null values everywhere — no fake prices) ────────────────────────

const FALLBACK: MarketSummary = {
  indices: [
    { name: 'ASX 200',  value: null, change: null, changeAbs: null },
    { name: 'S&P 500',  value: null, change: null, changeAbs: null },
    { name: 'Nikkei',   value: null, change: null, changeAbs: null },
    { name: 'FTSE 100', value: null, change: null, changeAbs: null },
  ],
  commodities: [
    { name: 'Gold',    unit: '/oz',  value: null, change: null },
    { name: 'WTI Oil', unit: '/bbl', value: null, change: null },
    { name: 'Silver',  unit: '/oz',  value: null, change: null },
  ],
  fx: [
    { pair: 'AUD/USD', value: null, change: null },
    { pair: 'AUD/CNY', value: null, change: null },
    { pair: 'AUD/JPY', value: null, change: null },
    { pair: 'AUD/EUR', value: null, change: null },
  ],
  topMovers: [
    { ticker: 'CBA', name: 'Commonwealth Bank',   price: null, change: null },
    { ticker: 'BHP', name: 'BHP Group',           price: null, change: null },
    { ticker: 'WDS', name: 'Woodside Energy',     price: null, change: null },
    { ticker: 'RIO', name: 'Rio Tinto',           price: null, change: null },
    { ticker: 'FMG', name: 'Fortescue',           price: null, change: null },
  ],
  asx: null,
}

// ── Sector colours (no free real-time sector data available) ──────────────────
const SECTORS = [
  { name: 'Energy',     change: 0 },
  { name: 'Materials',  change: 0 },
  { name: 'Financials', change: 0 },
  { name: 'Health',     change: 0 },
  { name: 'Tech',       change: 0 },
  { name: 'REITs',      change: 0 },
  { name: 'Utilities',  change: 0 },
  { name: 'Consumer',   change: 0 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return '—'
  return n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ChangeChip({ change }: { change: number | null }) {
  if (change === null)
    return <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>—</span>
  const positive = change > 0
  const neutral  = change === 0
  const color = neutral ? 'var(--text-muted)' : positive ? 'var(--green)' : 'var(--red)'
  const bg    = neutral ? 'var(--bg-4)'       : positive ? 'var(--green-a)' : 'var(--red-a)'
  const border= neutral ? 'var(--line)'       : positive ? 'var(--green-b)' : 'var(--red-b)'
  const Icon  = neutral ? Minus : positive ? TrendingUp : TrendingDown
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {positive ? '+' : ''}{change.toFixed(2)}%
    </span>
  )
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {/* Gold accent bar */}
      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </span>
      {note && (
        <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-md"
          style={{ color: 'var(--text-faint)', background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
          {note}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

// ── Browser-side Yahoo Finance (user's IP — never blocked by Yahoo Finance) ───
// Called AFTER the Edge route attempt. Logs errors to console for diagnosis.

const YF_STOCK_SYMS  = ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX']
const YF_INDEX_SYMS  = ['^AXJO', '^GSPC', '^N225', '^FTSE']
const YF_ALL_SYMS    = [...YF_STOCK_SYMS, ...YF_INDEX_SYMS]

const YF_STOCK_NAMES: Record<string, string> = {
  'CBA.AX': 'Commonwealth Bank', 'BHP.AX': 'BHP Group',
  'WDS.AX': 'Woodside Energy',   'RIO.AX': 'Rio Tinto',
  'FMG.AX': 'Fortescue',         'CSL.AX': 'CSL Limited',
  'NAB.AX': 'Natl Australia Bank','ANZ.AX': 'ANZ Group',
}
const YF_INDEX_NAMES: Record<string, string> = {
  '^AXJO': 'ASX 200', '^GSPC': 'S&P 500', '^N225': 'Nikkei', '^FTSE': 'FTSE 100',
}

interface YFQuote {
  symbol: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
}

function buildStocksFromYF(results: YFQuote[]): StocksResponse {
  const bySymbol = new Map(results.map((r) => [r.symbol, r]))

  const topMovers = YF_STOCK_SYMS.map((sym) => {
    const q = bySymbol.get(sym)
    return {
      ticker:    sym.replace('.AX', ''),
      name:      YF_STOCK_NAMES[sym],
      price:     q?.regularMarketPrice         ?? null,
      change:    q?.regularMarketChangePercent ?? null,
      changeAbs: q?.regularMarketChange        ?? null,
    }
  }).sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))

  const indices = YF_INDEX_SYMS.map((sym) => {
    const q = bySymbol.get(sym)
    return {
      name:      YF_INDEX_NAMES[sym],
      value:     q?.regularMarketPrice         ?? null,
      change:    q?.regularMarketChangePercent ?? null,
      changeAbs: q?.regularMarketChange        ?? null,
    }
  })

  const axjoQ = bySymbol.get('^AXJO')
  const asx: AsxData | null = axjoQ
    ? { price: axjoQ.regularMarketPrice, change: axjoQ.regularMarketChangePercent, changeAbs: axjoQ.regularMarketChange }
    : null

  return { topMovers, indices, asx, source: 'yahoo-browser', fetchedAt: new Date().toISOString() }
}

async function fetchStocksFromBrowser(): Promise<StocksResponse | null> {
  const symbolStr = YF_ALL_SYMS.join(',')

  // Try query1 first, then query2 (different CDN region)
  for (const host of ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']) {
    try {
      const url = `https://${host}/v7/finance/quote?symbols=${symbolStr}&lang=en-US&region=AU`
      const res = await fetch(url, {
        headers: {
          'Accept':          'application/json, text/plain, */*',
          'Accept-Language': 'en-AU,en-US;q=0.9',
        },
      })

      if (!res.ok) {
        console.error(`[Fiscus/stocks] Yahoo (${host}) HTTP ${res.status}`)
        continue
      }

      const data = await res.json() as { quoteResponse?: { result?: YFQuote[] } }
      const results = data?.quoteResponse?.result ?? []

      if (results.length === 0) {
        console.error(`[Fiscus/stocks] Yahoo (${host}) returned 0 results`, data)
        continue
      }

      console.info(`[Fiscus/stocks] Yahoo (${host}) ✓ got ${results.length} quotes`)
      return buildStocksFromYF(results)
    } catch (e) {
      // TypeError: Failed to fetch = CORS block or network error
      console.error(`[Fiscus/stocks] Yahoo (${host}) fetch error:`, e)
    }
  }

  return null
}

// ── Merge stocks/indices from the Edge route into the summary ─────────────────

function mergeStocks(base: MarketSummary, stocks: StocksResponse): MarketSummary {
  // Update topMovers — preserve base names if stocks entry is missing
  const byTicker = new Map(stocks.topMovers.map((s) => [s.ticker, s]))
  const topMovers: MoverData[] = base.topMovers.map((m) => {
    const s = byTicker.get(m.ticker)
    return s ? { ticker: m.ticker, name: m.name, price: s.price, change: s.change } : m
  })
  // Add any extra tickers the Edge route returned that aren't in base
  for (const s of stocks.topMovers) {
    if (!topMovers.find((m) => m.ticker === s.ticker)) {
      topMovers.push({ ticker: s.ticker, name: s.name, price: s.price, change: s.change })
    }
  }
  topMovers.sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))

  // Update indices
  const byName = new Map(stocks.indices.map((i) => [i.name, i]))
  const indices: IndexData[] = base.indices.map((idx) => {
    const i = byName.get(idx.name)
    return i ? { name: idx.name, value: i.value, change: i.change, changeAbs: i.changeAbs } : idx
  })

  const hasLiveStocks  = topMovers.some((m) => m.price  !== null)
  const hasLiveIndices = indices.some((i) => i.value !== null)

  return {
    ...base,
    topMovers,
    indices,
    asx: stocks.asx ?? base.asx,
    meta: base.meta
      ? {
          ...base.meta,
          hasLiveStocks,
          hasLiveIndices,
          hasAnyLive:  base.meta.hasAnyLive || hasLiveStocks || hasLiveIndices,
          dataSource:  stocks.source,
        }
      : base.meta,
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [data,        setData]        = useState<MarketSummary>(FALLBACK)
  const [loading,     setLoading]     = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const meta        = data.meta
  const hasAnyLive  = meta?.hasAnyLive         ?? false
  const stocksLive  = meta?.hasLiveStocks      ?? false
  const fxLive      = meta?.hasLiveFX          ?? false
  const indicesLive = meta?.hasLiveIndices     ?? false
  const commodLive  = meta?.hasLiveCommodities ?? false

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      // Fetch FX/metals (Lambda) and stocks/indices (Edge) in parallel
      const [summaryRes, stocksRes] = await Promise.all([
        fetch('/api/market/summary'),
        fetch('/api/market/stocks'),
      ])

      let combined: MarketSummary = FALLBACK

      if (summaryRes.ok) {
        const summaryData: MarketSummary = await summaryRes.json()
        if (summaryData?.indices && summaryData?.topMovers) {
          combined = summaryData
        }
      }

      if (stocksRes.ok) {
        const stocksData: StocksResponse = await stocksRes.json()
        if (stocksData?.source !== 'none') {
          combined = mergeStocks(combined, stocksData)
        }
      }

      // If Edge route had no stocks, fall back to browser-side Yahoo Finance.
      // The user's browser IP is never blocked — this is the reliable path.
      const missingStocks  = !combined.topMovers.some((m) => m.price  !== null)
      const missingIndices = !combined.indices.some((i)  => i.value !== null)
      if (missingStocks || missingIndices) {
        const browserData = await fetchStocksFromBrowser()
        if (browserData) {
          combined = mergeStocks(combined, browserData)
        }
      }

      setData(combined)
      setLastUpdated(new Date())
    } catch {
      // keep whatever we have
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const asx       = data.asx
  const asxChange = asx?.change ?? 0

  function freshnessLabel(): string {
    if (!hasAnyLive) return 'Data unavailable'
    const parts: string[] = []
    if (stocksLive)  parts.push('stocks ~15 min delay')
    if (commodLive)  parts.push('commodities real-time')
    if (fxLive)      parts.push('FX real-time')
    if (indicesLive) parts.push('indices ~15 min delay')
    return parts.length ? parts.join(' · ') : 'partial data'
  }

  function sourceLabel(): string {
    const src = meta?.dataSource
    if (src === 'yahoo')  return 'Yahoo Finance'
    if (src === 'stooq')  return 'Stooq'
    if (src === 'fmp')    return 'FMP'
    if (src === 'asx')    return 'ASX'
    return 'Twelve Data'
  }

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4 space-y-5">

        {/* ── ASX 200 Hero ─────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden relative chart-grid"
          style={{
            background: 'linear-gradient(145deg, #111826 0%, #0a1020 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Ambient colour gradient from chart direction */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: asxChange >= 0
                ? 'radial-gradient(ellipse 100% 70% at 20% 0%, rgba(34,212,138,0.06) 0%, transparent 60%)'
                : 'radial-gradient(ellipse 100% 70% at 20% 0%, rgba(255,79,79,0.06) 0%, transparent 60%)',
            }}
          />

          <div className="relative p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div
                  className="text-[9px] font-mono font-bold tracking-[0.20em] uppercase mb-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  S&P / ASX 200 INDEX
                </div>
                <div className="flex items-baseline gap-3">
                  <span
                    className="font-mono font-bold"
                    style={{ fontSize: 32, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
                  >
                    {asx ? fmt(asx.price, 1) : loading ? '···' : '—'}
                  </span>
                  <ChangeChip change={asx?.change ?? null} />
                  {indicesLive && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded-md flex items-center gap-1"
                      style={{
                        background: 'rgba(34,212,138,0.10)',
                        color: 'var(--green)',
                        border: '1px solid rgba(34,212,138,0.28)',
                      }}
                    >
                      <span className="live-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
                      LIVE
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {asx
                    ? `${(asx.changeAbs ?? 0) >= 0 ? '▲' : '▼'} ${Math.abs(asx.changeAbs ?? 0).toFixed(1)} pts`
                    : ''}
                  {lastUpdated
                    ? ` · ${lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </div>
              </div>

              {/* RBA Rate */}
              <div
                className="text-right flex flex-col items-end gap-1 px-3 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(232,184,75,0.07)',
                  border: '1px solid rgba(232,184,75,0.16)',
                }}
              >
                <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                  RBA Rate
                </div>
                <div className="font-mono text-[20px] font-bold" style={{ color: 'var(--gold)', letterSpacing: '-0.02em' }}>
                  4.10%
                </div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>Unchanged</div>
              </div>
            </div>

            {/* Mini chart */}
            <div style={{ height: 72, marginTop: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 0 }]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="asx-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={asxChange >= 0 ? '#22d48a' : '#ff4f4f'} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={asxChange >= 0 ? '#22d48a' : '#ff4f4f'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={asxChange >= 0 ? '#22d48a' : '#ff4f4f'}
                    strokeWidth={2}
                    fill="url(#asx-grad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────────── */}
        <div>
          <SectionHeader
            title="Global Indices"
            note={indicesLive ? '~15 min delay' : loading ? 'loading…' : 'unavailable'}
          />
          <div className="grid grid-cols-2 gap-2">
            {data.indices.map((idx) => (
              <div
                key={idx.name}
                className="rounded-2xl p-3.5"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <div
                  className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {idx.name}
                </div>
                <div className="font-mono font-bold text-[16px]" style={{ letterSpacing: '-0.01em' }}>
                  {idx.value !== null
                    ? fmt(idx.value, idx.name === 'Nikkei' ? 0 : 2)
                    : loading ? '···' : '—'}
                </div>
                <div className="mt-1.5">
                  <ChangeChip change={idx.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sector Performance ────────────────────────────────── */}
        <div>
          <SectionHeader title="Sector Performance" note="indicative" />
          <div className="rounded-xl p-3"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SECTORS} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={18}>
                <XAxis dataKey="name"
                  tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                  axisLine={false} tickLine={false} />
                <Tooltip cursor={false}
                  contentStyle={{ background: 'var(--bg-4)', border: '1px solid var(--line-2)', borderRadius: 8,
                    fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                  formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, '']} />
                <Bar dataKey="change" radius={[3, 3, 0, 0]}>
                  {SECTORS.map((s, i) => (
                    <Cell key={i} fill={s.change >= 0 ? '#2ed494' : '#ff5252'} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Commodities ───────────────────────────────────────── */}
        <div>
          <SectionHeader
            title="Commodities"
            note={commodLive ? 'real-time' : loading ? 'loading…' : 'unavailable'}
          />
          <div className="space-y-2">
            {data.commodities.map((c) => (
              <div
                key={c.name}
                className="rounded-2xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <span className="text-[13px] font-semibold" style={{ letterSpacing: '-0.01em' }}>{c.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-[13px]">
                    {c.value !== null ? `$${fmt(c.value)}` : loading ? '···' : '—'}
                    {c.value !== null && (
                      <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>
                        {c.unit}
                      </span>
                    )}
                  </span>
                  <ChangeChip change={c.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FX ───────────────────────────────────────────────── */}
        <div>
          <SectionHeader
            title="Foreign Exchange"
            note={
              fxLive
                ? data.fx.some((f) => f.source === 'ecb')
                  ? 'real-time · ECB where noted'
                  : 'real-time'
                : meta?.fxDate
                  ? `ECB · ${meta.fxDate}`
                  : loading ? 'loading…' : 'unavailable'
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {data.fx.map((fx) => (
              <div
                key={fx.pair}
                className="rounded-2xl p-3.5"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[9px] font-mono tracking-[0.14em] uppercase"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {fx.pair}
                  </span>
                  {fx.source === 'ecb' && (
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded"
                      style={{ color: 'var(--text-faint)', background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
                      ECB
                    </span>
                  )}
                </div>
                <div className="font-mono font-bold text-[16px] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                  {fx.value !== null
                    ? fmt(fx.value, fx.pair.includes('JPY') ? 3 : 4)
                    : loading ? '···' : '—'}
                </div>
                <ChangeChip change={fx.change} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Movers ────────────────────────────────────────── */}
        <div>
          <SectionHeader
            title="ASX Top Stocks"
            note={stocksLive ? '~15 min delay' : loading ? 'loading…' : 'unavailable'}
          />
          <div className="space-y-2">
            {data.topMovers.map((m) => {
              const posChange = (m.change ?? 0) >= 0
              return (
                <div
                  key={m.ticker}
                  className="rounded-2xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
                >
                  <div className="flex items-center gap-3">
                    {/* Ticker badge */}
                    <div
                      className="flex items-center justify-center font-mono text-[10px] font-bold rounded-lg"
                      style={{
                        width: 40, height: 28,
                        background: posChange ? 'var(--green-a)' : 'var(--red-a)',
                        border: `1px solid ${posChange ? 'var(--green-b)' : 'var(--red-b)'}`,
                        color: posChange ? 'var(--green)' : 'var(--red)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {m.ticker}
                    </div>
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      {m.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-[13px]">
                      {m.price !== null ? `$${fmt(m.price)}` : loading ? '···' : '—'}
                    </span>
                    <ChangeChip change={m.change} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="text-center pb-2 space-y-1">
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {hasAnyLive
              ? `${sourceLabel()} · Twelve Data · ${freshnessLabel()}`
              : 'Market data unavailable · Check connection'}
            {' · Not financial advice'}
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-center gap-1" style={{ color: 'var(--text-faint)' }}>
              <RefreshCw size={9} />
              <span className="text-[9px] font-mono">
                Fetched {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
