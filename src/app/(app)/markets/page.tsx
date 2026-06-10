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
}

interface MarketSummary {
  indices:     IndexData[]
  commodities: CommodData[]
  fx:          FxData[]
  topMovers:   MoverData[]
  asx:         AsxData | null
  meta?:       MetaData
}

// ── Fallback structure (values shown only before first successful API call) ───
// These are NOT claimed to be real — the page marks them as indicative.
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

// ── Sector colours (ASX sector ETFs are not freely available — static) ────────
const SECTORS = [
  { name: 'Energy',    change: 0 },
  { name: 'Materials', change: 0 },
  { name: 'Financials',change: 0 },
  { name: 'Health',    change: 0 },
  { name: 'Tech',      change: 0 },
  { name: 'REITs',     change: 0 },
  { name: 'Utilities', change: 0 },
  { name: 'Consumer',  change: 0 },
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
  const Icon  = neutral ? Minus : positive ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{ color, background: bg }}>
      <Icon size={10} strokeWidth={2.5} />
      {positive ? '+' : ''}{change.toFixed(2)}%
    </span>
  )
}

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
        {title}
      </span>
      {note && (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{ color: 'var(--text-faint)', background: 'var(--bg-3)' }}>
          {note}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [data,    setData]    = useState<MarketSummary>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Derived from the API meta — which categories have real data
  const meta        = data.meta
  const hasAnyLive  = meta?.hasAnyLive         ?? false
  const stocksLive  = meta?.hasLiveStocks      ?? false
  const fxLive      = meta?.hasLiveFX          ?? false
  const indicesLive = meta?.hasLiveIndices      ?? false
  const commodLive  = meta?.hasLiveCommodities  ?? false

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/market/summary')
      if (res.ok) {
        const json: MarketSummary = await res.json()
        // Switch to API data whenever we get a valid response.
        // Even if some fields are null, showing null (—) is more accurate
        // than showing hardcoded indicative values.
        if (json?.indices && json?.topMovers) {
          setData(json)
          setLastUpdated(new Date())
        }
      }
    } catch {
      // keep whatever we already have
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

  // Data freshness label
  function freshnessLabel(): string {
    if (!hasAnyLive) return 'Data unavailable'
    const parts: string[] = []
    if (stocksLive)  parts.push('stocks 15-min delay')
    if (commodLive)  parts.push('commodities real-time')
    if (fxLive)      parts.push('FX real-time')
    if (indicesLive) parts.push('indices 15-min delay')
    return parts.length ? parts.join(' · ') : 'partial data'
  }

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4 space-y-5">

        {/* ── ASX 200 Hero ─────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden relative chart-grid"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(7,9,26,0.2) 0%, transparent 50%, rgba(7,9,26,0.6) 100%)' }} />
          <div className="relative p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                  ASX 200
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-mono font-semibold" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                    {asx ? fmt(asx.price, 1) : loading ? '···' : '—'}
                  </span>
                  <ChangeChip change={asx?.change ?? null} />
                  {/* Only show LIVE badge when we genuinely have live index data */}
                  {indicesLive && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(46,212,148,0.12)',
                        color:      'var(--green)',
                        border:     '1px solid rgba(46,212,148,0.3)',
                      }}>
                      ● LIVE
                    </span>
                  )}
                </div>
                <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {asx ? `${(asx.changeAbs ?? 0) >= 0 ? '▲' : '▼'} ${Math.abs(asx.changeAbs ?? 0).toFixed(1)} pts` : ''}
                  {lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>RBA Rate</div>
                <div className="font-mono text-[18px] font-semibold" style={{ color: 'var(--gold)' }}>4.10%</div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>Unchanged</div>
              </div>
            </div>
            <div style={{ height: 72, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[{ v: 0 }]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="asx-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={asxChange >= 0 ? '#2ed494' : '#ff5252'} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={asxChange >= 0 ? '#2ed494' : '#ff5252'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v"
                    stroke={asxChange >= 0 ? '#2ed494' : '#ff5252'}
                    strokeWidth={1.5} fill="url(#asx-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────────── */}
        <div>
          <SectionHeader
            title="Global Indices"
            note={indicesLive ? '~15 min delay' : 'unavailable'}
          />
          <div className="grid grid-cols-2 gap-2">
            {data.indices.map((idx) => (
              <div key={idx.name} className="rounded-xl p-3"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="text-[10px] font-mono tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  {idx.name}
                </div>
                <div className="font-mono font-semibold text-[15px]">
                  {fmt(idx.value, idx.name === 'Nikkei' ? 0 : 2)}
                </div>
                <div className="mt-1">
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
            note={commodLive ? 'real-time' : 'unavailable'}
          />
          <div className="space-y-1.5">
            {data.commodities.map((c) => (
              <div key={c.name} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <span className="text-[13px] font-medium">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px]">
                    {c.value !== null ? `$${fmt(c.value)}` : '—'}
                    {c.value !== null && (
                      <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit}</span>
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
                  ? 'real-time · ECB rates where noted'
                  : 'real-time'
                : meta?.fxDate
                  ? `ECB rate · ${meta.fxDate}`
                  : 'unavailable'
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {data.fx.map((fx) => (
              <div key={fx.pair} className="rounded-xl p-3"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {fx.pair}
                  </span>
                  {fx.source === 'ecb' && (
                    <span className="text-[8px] font-mono" style={{ color: 'var(--text-faint)' }}>ECB</span>
                  )}
                </div>
                <div className="font-mono font-semibold text-[15px] mb-1">
                  {fx.value !== null ? fmt(fx.value, fx.pair.includes('JPY') ? 3 : 4) : '—'}
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
            note={stocksLive ? '~15 min delay' : 'unavailable'}
          />
          <div className="space-y-1.5">
            {data.topMovers.map((m) => (
              <div key={m.ticker} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                    style={{
                      background: (m.change ?? 0) >= 0 ? 'var(--green-a)' : 'var(--red-a)',
                      color:      (m.change ?? 0) >= 0 ? 'var(--green)'   : 'var(--red)',
                    }}>
                    {m.ticker}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px]">
                    {m.price !== null ? `$${fmt(m.price)}` : '—'}
                  </span>
                  <ChangeChip change={m.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="text-center pb-2 space-y-1">
          <div className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {hasAnyLive
              ? `Twelve Data · ${freshnessLabel()}`
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
