'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface IndexData   { name: string; symbol: string; value: number | null; change: number | null; changeAbs: number | null }
interface CommodData  { name: string; unit: string; symbol: string; value: number | null; change: number | null }
interface FxData      { pair: string; symbol: string; value: number | null; change: number | null }
interface MoverData   { ticker: string; name: string; symbol: string; price: number | null; change: number | null }
interface QuoteData   { price: number; change: number; changeAbs: number; marketState?: string }

interface MarketSummary {
  indices:    IndexData[]
  commodities: CommodData[]
  fx:         FxData[]
  topMovers:  MoverData[]
  asx:        QuoteData | null
}

// ── Sector colours (static — ASX sector ETFs are hard to get for free) ────────
const SECTORS = [
  { name: 'Energy',    change: 1.82  },
  { name: 'Materials', change: -1.21 },
  { name: 'Financials',change: 0.94  },
  { name: 'Health',    change: -0.38 },
  { name: 'Tech',      change: 2.14  },
  { name: 'REITs',     change: -0.67 },
  { name: 'Utilities', change: 0.22  },
  { name: 'Consumer',  change: -0.85 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return '—'
  return n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ChangeChip({ change }: { change: number | null }) {
  if (change === null) return <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>—</span>
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
        {title}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

function Skeleton({ w = '100%', h = 16 }: { w?: string | number; h?: number }) {
  return (
    <div className="rounded animate-pulse" style={{ width: w, height: h, background: 'var(--bg-4)' }} />
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const [data,    setData]    = useState<MarketSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/market/summary')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastUpdated(new Date())
      }
    } catch { /* keep previous data */ } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(() => load(true), 60_000) // refresh every 60s
    return () => clearInterval(id)
  }, [])

  const asx        = data?.asx
  const asxChange  = asx?.change ?? -0.43
  const asxChartData = [{ v: 0 }] // real chart data added in task 4.1.4

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
                  {loading && !data ? (
                    <Skeleton w={120} h={28} />
                  ) : (
                    <span className="font-mono font-semibold" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                      {asx ? fmt(asx.price, 1) : '—'}
                    </span>
                  )}
                  <ChangeChip change={asx?.change ?? null} />
                </div>
                <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {asx ? `${asx.changeAbs >= 0 ? '▲' : '▼'} ${Math.abs(asx.changeAbs).toFixed(1)} pts` : ''}
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
                <AreaChart data={asxChartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
          <SectionHeader title="Global Indices" />
          <div className="grid grid-cols-2 gap-2">
            {loading && !data
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <Skeleton w="60%" />
                    <Skeleton w="80%" h={20} />
                    <Skeleton w={60} h={18} />
                  </div>
                ))
              : (data?.indices ?? []).map((idx) => (
                  <div key={idx.name} className="rounded-xl p-3"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <div className="text-[10px] font-mono tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                      {idx.name}
                    </div>
                    <div className="font-mono font-semibold text-[15px]">
                      {fmt(idx.value, idx.symbol.includes('^N225') ? 0 : 2)}
                    </div>
                    <div className="mt-1">
                      <ChangeChip change={idx.change} />
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* ── Sector Performance ────────────────────────────────── */}
        <div>
          <SectionHeader title="Sector Performance" />
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
          <SectionHeader title="Commodities" />
          <div className="space-y-1.5">
            {loading && !data
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <Skeleton w={80} />
                    <Skeleton w={100} />
                  </div>
                ))
              : (data?.commodities ?? []).map((c) => (
                  <div key={c.name} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <span className="text-[13px] font-medium">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px]">
                        {c.value !== null ? `$${fmt(c.value)}` : '—'}
                        <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit}</span>
                      </span>
                      <ChangeChip change={c.change} />
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* ── FX ───────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Foreign Exchange" />
          <div className="grid grid-cols-2 gap-2">
            {loading && !data
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-3 space-y-2"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <Skeleton w="60%" />
                    <Skeleton w="80%" h={20} />
                    <Skeleton w={60} h={18} />
                  </div>
                ))
              : (data?.fx ?? []).map((fx) => (
                  <div key={fx.pair} className="rounded-xl p-3"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <div className="text-[10px] font-mono tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                      {fx.pair}
                    </div>
                    <div className="font-mono font-semibold text-[15px] mb-1">
                      {fx.value !== null ? fmt(fx.value, 4) : '—'}
                    </div>
                    <ChangeChip change={fx.change} />
                  </div>
                ))
            }
          </div>
        </div>

        {/* ── Top Movers ────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Top Movers" />
          <div className="space-y-1.5">
            {loading && !data
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                    <Skeleton w={160} />
                    <Skeleton w={100} />
                  </div>
                ))
              : (data?.topMovers ?? []).map((m) => (
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
                ))
            }
          </div>
        </div>

        {/* ── Footer note ───────────────────────────────────────── */}
        <div className="text-center pb-2">
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            Prices via Yahoo Finance · 5-min delay · Not financial advice
          </span>
          {lastUpdated && (
            <div className="flex items-center justify-center gap-1 mt-1"
              style={{ color: 'var(--text-faint)' }}>
              <RefreshCw size={9} />
              <span className="text-[9px] font-mono">
                Updated {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
