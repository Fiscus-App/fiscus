'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoverData { ticker: string; name: string; price: number; change: number; changeAbs: number; sector?: string; color?: string }
interface IndexData { name: string; value: number; change: number; changeAbs: number }
interface CommodityData { name: string; unit: string; value: number; change: number }
interface FXData { pair: string; value: number; change: number }
interface SectorData { name: string; change: number }
interface ASXData { price: number; change: number; changeAbs: number }

interface LiveSummary {
  indices:   { name: string; value: number | null; change: number | null; changeAbs: number | null }[]
  commodities: { name: string; unit: string; value: number | null; change: number | null }[]
  fx:        { pair: string; value: number | null; change: number | null; source: string | null }[]
  topMovers: { ticker: string; name: string; price: number | null; change: number | null; changeAbs: number | null }[]
  asx:       { price: number; change: number; changeAbs: number } | null
  meta:      { hasAnyLive: boolean; dataSource: string; fetchedAt: string }
}

// ─── Ghost data (full original data set) ──────────────────────────────────────

const GHOST_ASX: ASXData = { price: 8312.4, change: 0.74, changeAbs: 61.2 }

const GHOST_ASX_CHART = [8180, 8205, 8190, 8228, 8244, 8258, 8241, 8270, 8289, 8301, 8295, 8312].map(v => ({ v }))

const GHOST_INDICES: IndexData[] = [
  { name: 'ASX 200',   value: 8312.4,  change:  0.74, changeAbs:   61.2 },
  { name: 'S&P 500',   value: 5842.6,  change:  0.38, changeAbs:   22.1 },
  { name: 'Nikkei',    value: 39814,   change: -0.21, changeAbs:  -83.8 },
  { name: 'FTSE 100',  value: 8621.3,  change:  0.14, changeAbs:   12.1 },
  { name: 'Hang Seng', value: 21042.8, change: -0.55, changeAbs: -116.2 },
  { name: 'DAX',       value: 18924.4, change:  0.29, changeAbs:   54.8 },
]

const GHOST_SECTORS: SectorData[] = [
  { name: 'Energy',     change:  1.42 },
  { name: 'Materials',  change: -0.88 },
  { name: 'Financials', change:  0.93 },
  { name: 'Health',     change:  0.44 },
  { name: 'Tech',       change:  2.18 },
  { name: 'REITs',      change: -0.31 },
  { name: 'Utilities',  change: -0.14 },
  { name: 'Consumer',   change:  0.62 },
]

const GHOST_COMMODITIES: CommodityData[] = [
  { name: 'Gold',          unit: '/oz',    value: 3298.40, change:  0.42 },
  { name: 'Silver',        unit: '/oz',    value:   32.84, change:  0.88 },
  { name: 'WTI Crude',     unit: '/bbl',   value:   78.24, change: -1.14 },
  { name: 'Brent Crude',   unit: '/bbl',   value:   82.40, change: -0.94 },
  { name: 'Iron Ore',      unit: '/t',     value:  108.20, change: -2.34 },
  { name: 'Copper',        unit: '/lb',    value:    4.82, change:  1.08 },
  { name: 'Natural Gas',   unit: '/MMBtu', value:    2.94, change:  3.22 },
  { name: 'Coal',          unit: '/t',     value:  142.80, change: -0.68 },
]

const GHOST_FX: FXData[] = [
  { pair: 'AUD/USD', value: 0.6482, change:  0.24 },
  { pair: 'AUD/CNY', value: 4.6831, change:  0.18 },
  { pair: 'AUD/JPY', value: 98.420, change:  0.32 },
  { pair: 'AUD/EUR', value: 0.5924, change: -0.11 },
  { pair: 'AUD/GBP', value: 0.5082, change:  0.09 },
  { pair: 'USD/JPY', value: 151.84, change:  0.08 },
]

const GHOST_GAINERS: MoverData[] = [
  { ticker: 'PLS', name: 'Pilbara Minerals', price:  3.18, change:  8.42, changeAbs: 0.25, sector: 'Lithium',    color: '#22d48a' },
  { ticker: 'NXT', name: 'NextDC',           price: 17.84, change:  5.21, changeAbs: 0.88, sector: 'Tech',       color: '#a78bfa' },
  { ticker: 'NST', name: 'Northern Star',    price: 16.22, change:  4.32, changeAbs: 0.67, sector: 'Gold',       color: '#e8b84b' },
  { ticker: 'WTC', name: 'WiseTech Global',  price: 98.40, change:  4.77, changeAbs: 4.49, sector: 'Tech',       color: '#a78bfa' },
  { ticker: 'PME', name: 'Pro Medicus',      price:224.80, change:  3.44, changeAbs: 7.48, sector: 'Healthtech', color: '#a78bfa' },
]

const GHOST_FALLERS: MoverData[] = [
  { ticker: 'IGO', name: 'IGO Limited',      price:  4.82, change: -4.63, changeAbs: -0.23, sector: 'Lithium', color: '#ff4f4f' },
  { ticker: 'AGL', name: 'AGL Energy',       price:  9.74, change: -6.82, changeAbs: -0.71, sector: 'Energy',  color: '#f97316' },
  { ticker: 'FLT', name: 'Flight Centre',    price: 17.08, change: -4.91, changeAbs: -0.88, sector: 'Travel',  color: '#ff4f4f' },
  { ticker: 'WHC', name: 'Whitehaven Coal',  price:  6.72, change: -2.98, changeAbs: -0.21, sector: 'Energy',  color: '#f97316' },
  { ticker: 'BOE', name: 'Boss Energy',      price:  2.94, change: -4.21, changeAbs: -0.13, sector: 'Uranium', color: '#f97316' },
]

const GHOST_TOP_STOCKS: MoverData[] = [
  { ticker: 'CBA', name: 'Commonwealth Bank',  price: 162.40, change:  1.82, changeAbs:  2.91, color: '#5b8af5' },
  { ticker: 'BHP', name: 'BHP Group',          price:  44.82, change: -0.94, changeAbs: -0.43, color: '#2ed494' },
  { ticker: 'CSL', name: 'CSL Limited',        price: 298.40, change:  1.14, changeAbs:  3.37, color: '#a78bfa' },
  { ticker: 'NAB', name: 'National Australia', price:  38.92, change:  0.44, changeAbs:  0.17, color: '#5b8af5' },
  { ticker: 'WBC', name: 'Westpac Banking',    price:  29.18, change:  0.71, changeAbs:  0.21, color: '#5b8af5' },
  { ticker: 'MQG', name: 'Macquarie Group',    price: 224.60, change: -0.88, changeAbs: -1.99, color: '#e8b84b' },
  { ticker: 'WDS', name: 'Woodside Energy',    price:  24.12, change:  2.81, changeAbs:  0.66, color: '#f97316' },
  { ticker: 'ANZ', name: 'ANZ Group',          price:  30.48, change:  0.62, changeAbs:  0.19, color: '#5b8af5' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ChangeChip({ change }: { change: number }) {
  const positive = change > 0
  const neutral  = change === 0
  const color  = neutral ? 'var(--text-muted)' : positive ? 'var(--green)' : 'var(--red)'
  const bg     = neutral ? 'var(--bg-4)'       : positive ? 'var(--green-a)' : 'var(--red-a)'
  const border = neutral ? 'var(--line)'       : positive ? 'var(--green-b)' : 'var(--red-b)'
  const Icon   = neutral ? Minus : positive ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
      style={{ color, background: bg, border: `1px solid ${border}` }}>
      <Icon size={10} strokeWidth={2.5} />
      {positive ? '+' : ''}{change.toFixed(2)}%
    </span>
  )
}

function SectionHeader({ title, live }: { title: string; live: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono"
        style={{ color: 'var(--text-secondary)' }}>{title}</span>
      <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-md"
        style={live
          ? { color: '#2ed494', background: 'rgba(46,212,148,0.08)', border: '1px solid rgba(46,212,148,0.2)' }
          : { color: 'rgba(232,184,75,0.5)', background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.12)' }}>
        {live ? 'LIVE' : 'SIMULATED'}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

function Skeleton({ h = 48, rounded = 'rounded-xl' }: { h?: number; rounded?: string }) {
  return <div className={`${rounded} animate-pulse`} style={{ height: h, background: 'var(--bg-3)' }} />
}

// ─── Merge live data into ghost ────────────────────────────────────────────────
// For each value: use live when non-null, fall back to ghost

function mergeIndices(live: LiveSummary): IndexData[] {
  return GHOST_INDICES.map((g) => {
    const l = live.indices.find(i => i.name === g.name)
    return {
      name:      g.name,
      value:     l?.value     ?? g.value,
      change:    l?.change    ?? g.change,
      changeAbs: l?.changeAbs ?? g.changeAbs,
    }
  })
}

function mergeCommodities(live: LiveSummary): CommodityData[] {
  // Map our ghost commodity names to API names
  const nameMap: Record<string, string> = { 'Gold': 'Gold', 'WTI Crude': 'WTI Oil', 'Silver': 'Silver' }
  return GHOST_COMMODITIES.map(g => {
    const apiName = nameMap[g.name]
    const l = apiName ? live.commodities.find(c => c.name === apiName) : null
    return { ...g, value: l?.value ?? g.value, change: l?.change ?? g.change }
  })
}

function mergeFX(live: LiveSummary): FXData[] {
  return GHOST_FX.map(g => {
    const l = live.fx.find(f => f.pair === g.pair)
    return { ...g, value: l?.value ?? g.value, change: l?.change ?? g.change }
  })
}

function mergeTopStocks(live: LiveSummary): MoverData[] {
  return GHOST_TOP_STOCKS.map(g => {
    const l = live.topMovers.find(m => m.ticker === g.ticker)
    return {
      ...g,
      price:     l?.price     ?? g.price,
      change:    l?.change    ?? g.change,
      changeAbs: l?.changeAbs ?? g.changeAbs,
    }
  })
}

function deriveGainers(live: LiveSummary): MoverData[] | null {
  const hasLive = live.topMovers.some(m => m.price !== null)
  if (!hasLive) return null
  return live.topMovers
    .filter(m => (m.change ?? 0) > 0)
    .map(m => ({ ticker: m.ticker, name: m.name, price: m.price ?? 0, change: m.change ?? 0, changeAbs: m.changeAbs ?? 0, color: '#22d48a' }))
    .sort((a, b) => b.change - a.change)
    .slice(0, 5)
}

function deriveFallers(live: LiveSummary): MoverData[] | null {
  const hasLive = live.topMovers.some(m => m.price !== null)
  if (!hasLive) return null
  return live.topMovers
    .filter(m => (m.change ?? 0) < 0)
    .map(m => ({ ticker: m.ticker, name: m.name, price: m.price ?? 0, change: m.change ?? 0, changeAbs: m.changeAbs ?? 0, color: '#ff4f4f' }))
    .sort((a, b) => a.change - b.change)
    .slice(0, 5)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const router = useRouter()
  const [liveData, setLiveData] = useState<LiveSummary | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/market/summary')
      .then(r => r.ok ? r.json() : null)
      .then((d: LiveSummary | null) => { if (d) setLiveData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const live      = liveData?.meta?.hasAnyLive ?? false
  const asx       = liveData?.asx ?? GHOST_ASX
  const asxUp     = asx.change >= 0
  const indices   = liveData ? mergeIndices(liveData)     : GHOST_INDICES
  const comms     = liveData ? mergeCommodities(liveData) : GHOST_COMMODITIES
  const fx        = liveData ? mergeFX(liveData)          : GHOST_FX
  const topStocks = liveData ? mergeTopStocks(liveData)   : GHOST_TOP_STOCKS
  const gainers   = (liveData ? deriveGainers(liveData)   : null) ?? GHOST_GAINERS
  const fallers   = (liveData ? deriveFallers(liveData)   : null) ?? GHOST_FALLERS

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4 space-y-6">

        {/* ── ASX 200 Hero ─────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #111826 0%, #0a1020 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 100% 70% at 20% 0%, ${asxUp ? 'rgba(34,212,138,0.06)' : 'rgba(255,79,79,0.06)'} 0%, transparent 60%)` }} />

          <div className="relative p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[9px] font-mono font-bold tracking-[0.20em] uppercase mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>S&P / ASX 200 INDEX</div>

                {loading ? (
                  <div style={{ width: 180, height: 36 }}><Skeleton h={36} rounded="rounded-lg" /></div>
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono font-bold" style={{ fontSize: 32, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                      {fmt(asx.price, 1)}
                    </span>
                    <ChangeChip change={asx.change} />
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
                      style={live
                        ? { background: 'rgba(46,212,148,0.1)', color: '#2ed494', border: '1px solid rgba(46,212,148,0.2)' }
                        : { background: 'rgba(232,184,75,0.08)', color: 'rgba(232,184,75,0.55)', border: '1px solid rgba(232,184,75,0.15)' }}>
                      {live ? 'LIVE' : 'SIMULATED'}
                    </span>
                  </div>
                )}

                <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {asxUp ? '▲' : '▼'} {fmt(Math.abs(asx.changeAbs), 1)} pts · {new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* RBA Rate */}
              <div className="text-right flex flex-col items-end gap-1 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(232,184,75,0.07)', border: '1px solid rgba(232,184,75,0.16)' }}>
                <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>RBA Rate</div>
                <div className="font-mono text-[20px] font-bold" style={{ color: 'var(--gold)', letterSpacing: '-0.02em' }}>4.10%</div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>Unchanged</div>
              </div>
            </div>

            {/* Sparkline */}
            <div style={{ height: 72, marginTop: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GHOST_ASX_CHART} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="asx-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={asxUp ? '#22d48a' : '#ff4f4f'} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={asxUp ? '#22d48a' : '#ff4f4f'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={asxUp ? '#22d48a' : '#ff4f4f'} strokeWidth={2}
                    fill="url(#asx-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────── */}
        <div>
          <SectionHeader title="Global Indices" live={live} />
          {loading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4,5,6].map(i => <Skeleton key={i} h={76} rounded="rounded-2xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {indices.map(idx => (
                <div key={idx.name} className="rounded-2xl p-3.5"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                    style={{ color: 'var(--text-muted)' }}>{idx.name}</div>
                  <div className="font-mono font-bold text-[16px]" style={{ letterSpacing: '-0.01em' }}>
                    {fmt(idx.value, idx.name === 'Nikkei' ? 0 : 1)}
                  </div>
                  <div className="mt-1.5"><ChangeChip change={idx.change} /></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sector Performance ────────────────────────────── */}
        <div>
          <SectionHeader title="Sector Performance" live={false} />
          <div className="rounded-xl p-3"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={GHOST_SECTORS} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={18}>
                <XAxis dataKey="name"
                  tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                  axisLine={false} tickLine={false} />
                <Tooltip cursor={false}
                  contentStyle={{ background: 'var(--bg-4)', border: '1px solid var(--line-2)', borderRadius: 8,
                    fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
                  formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, '']} />
                <Bar dataKey="change" radius={[3, 3, 0, 0]}>
                  {GHOST_SECTORS.map((s, i) => (
                    <Cell key={i} fill={s.change >= 0 ? '#2ed494' : '#ff5252'} opacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Today's Top Gainers ───────────────────────────── */}
        <div>
          <SectionHeader title="Today's Top Gainers" live={live && gainers !== GHOST_GAINERS} />
          {loading ? <Skeleton h={220} rounded="rounded-2xl" /> : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {gainers.map((m, i) => (
                <button key={m.ticker}
                  onClick={() => router.push(`/asset/${m.ticker}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: 'var(--bg-2)', borderBottom: i < gainers.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                    style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ width: 38, height: 38, background: `${m.color ?? '#22d48a'}14`, border: `1px solid ${m.color ?? '#22d48a'}28` }}>
                    <span className="font-mono font-bold text-[9px]" style={{ color: m.color ?? '#22d48a' }}>{m.ticker}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px]">{m.ticker}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-[13px]">${fmt(m.price)}</div>
                    <div className="font-mono font-bold text-[11px]" style={{ color: 'var(--green)' }}>
                      ▲ {m.change.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Today's Top Fallers ───────────────────────────── */}
        <div>
          <SectionHeader title="Today's Top Fallers" live={live && fallers !== GHOST_FALLERS} />
          {loading ? <Skeleton h={220} rounded="rounded-2xl" /> : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {fallers.map((m, i) => (
                <button key={m.ticker}
                  onClick={() => router.push(`/asset/${m.ticker}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: 'var(--bg-2)', borderBottom: i < fallers.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                    style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                    style={{ width: 38, height: 38, background: `${m.color ?? '#ff4f4f'}14`, border: `1px solid ${m.color ?? '#ff4f4f'}28` }}>
                    <span className="font-mono font-bold text-[9px]" style={{ color: m.color ?? '#ff4f4f' }}>{m.ticker}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px]">{m.ticker}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-[13px]">${fmt(m.price)}</div>
                    <div className="font-mono font-bold text-[11px]" style={{ color: 'var(--red)' }}>
                      ▼ {Math.abs(m.change).toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Commodities ───────────────────────────────────── */}
        <div>
          <SectionHeader title="Commodities" live={live} />
          {loading ? <Skeleton h={280} rounded="rounded-2xl" /> : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {comms.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-3"
                  style={{ background: 'var(--bg-2)', borderBottom: i < comms.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span className="text-[13px] font-semibold">{c.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-[13px]">
                      ${fmt(c.value)}
                      <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit}</span>
                    </span>
                    <ChangeChip change={c.change} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Foreign Exchange ──────────────────────────────── */}
        <div>
          <SectionHeader title="Foreign Exchange" live={live} />
          {loading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4,5,6].map(i => <Skeleton key={i} h={76} rounded="rounded-2xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {fx.map(f => (
                <div key={f.pair} className="rounded-2xl p-3.5"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                    style={{ color: 'var(--text-muted)' }}>{f.pair}</div>
                  <div className="font-mono font-bold text-[16px] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                    {fmt(f.value, f.pair.includes('JPY') ? 3 : 4)}
                  </div>
                  <ChangeChip change={f.change} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ASX Top Stocks ────────────────────────────────── */}
        <div>
          <SectionHeader title="ASX Top Stocks" live={live} />
          {loading ? <Skeleton h={300} rounded="rounded-2xl" /> : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {topStocks.map((m, i) => (
                <button key={m.ticker}
                  onClick={() => router.push(`/asset/${m.ticker}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: 'var(--bg-2)', borderBottom: i < topStocks.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div className="flex items-center justify-center font-mono text-[10px] font-bold rounded-lg flex-shrink-0"
                    style={{
                      width: 40, height: 28,
                      background: m.change >= 0 ? 'var(--green-a)' : 'var(--red-a)',
                      border: `1px solid ${m.change >= 0 ? 'var(--green-b)' : 'var(--red-b)'}`,
                      color: m.change >= 0 ? 'var(--green)' : 'var(--red)',
                      letterSpacing: '0.04em',
                    }}>
                    {m.ticker}
                  </div>
                  <span className="flex-1 text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="font-mono font-bold text-[13px]">${fmt(m.price)}</span>
                    <ChangeChip change={m.change} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {live
              ? `Live data via Twelve Data · ${liveData?.meta?.fetchedAt ? new Date(liveData.meta.fetchedAt).toLocaleTimeString('en-AU') : ''}`
              : 'Figures may be simulated · Not financial advice'}
          </p>
        </div>

      </div>
    </div>
  )
}
