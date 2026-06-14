'use client'

import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ─── Ghost / simulated data ────────────────────────────────────────────────────
// All figures are illustrative placeholders.
// Replace these with live API data when market data phase resumes.

const GHOST_ASX = { price: 8312.4, change: 0.74, changeAbs: 61.2 }

const GHOST_ASX_CHART = [8180, 8205, 8190, 8228, 8244, 8258, 8241, 8270, 8289, 8301, 8295, 8312]
  .map((v) => ({ v }))

const GHOST_INDICES = [
  { name: 'ASX 200',  value: 8312.4,   change:  0.74, changeAbs:   61.2 },
  { name: 'S&P 500',  value: 5842.6,   change:  0.38, changeAbs:   22.1 },
  { name: 'Nikkei',   value: 39814,    change: -0.21, changeAbs:  -83.8 },
  { name: 'FTSE 100', value: 8621.3,   change:  0.14, changeAbs:   12.1 },
  { name: 'Hang Seng',value: 21042.8,  change: -0.55, changeAbs: -116.2 },
  { name: 'DAX',      value: 18924.4,  change:  0.29, changeAbs:   54.8 },
]

const GHOST_SECTORS = [
  { name: 'Energy',     change:  1.42 },
  { name: 'Materials',  change: -0.88 },
  { name: 'Financials', change:  0.93 },
  { name: 'Health',     change:  0.44 },
  { name: 'Tech',       change:  2.18 },
  { name: 'REITs',      change: -0.31 },
  { name: 'Utilities',  change: -0.14 },
  { name: 'Consumer',   change:  0.62 },
]

const GHOST_COMMODITIES = [
  { name: 'Gold',         unit: '/oz',  value: 3298.40, change:  0.42 },
  { name: 'Silver',       unit: '/oz',  value:   32.84, change:  0.88 },
  { name: 'WTI Crude',    unit: '/bbl', value:   78.24, change: -1.14 },
  { name: 'Brent Crude',  unit: '/bbl', value:   82.40, change: -0.94 },
  { name: 'Iron Ore',     unit: '/t',   value:  108.20, change: -2.34 },
  { name: 'Copper',       unit: '/lb',  value:    4.82, change:  1.08 },
  { name: 'Natural Gas',  unit: '/MMBtu',value:   2.94, change:  3.22 },
  { name: 'Coal',         unit: '/t',   value:  142.80, change: -0.68 },
]

const GHOST_FX = [
  { pair: 'AUD/USD', value: 0.6482, change:  0.24 },
  { pair: 'AUD/CNY', value: 4.6831, change:  0.18 },
  { pair: 'AUD/JPY', value: 98.420, change:  0.32 },
  { pair: 'AUD/EUR', value: 0.5924, change: -0.11 },
  { pair: 'AUD/GBP', value: 0.5082, change:  0.09 },
  { pair: 'USD/JPY', value: 151.84, change:  0.08 },
]

const GHOST_GAINERS = [
  { ticker: 'PLS',  name: 'Pilbara Minerals',   price:  3.18, change:  8.42, sector: 'Lithium',    color: '#22d48a' },
  { ticker: 'NXT',  name: 'NextDC',             price: 17.84, change:  5.21, sector: 'Tech',       color: '#a78bfa' },
  { ticker: 'NST',  name: 'Northern Star',      price: 16.22, change:  4.32, sector: 'Gold',       color: '#e8b84b' },
  { ticker: 'WTC',  name: 'WiseTech Global',    price: 98.40, change:  4.77, sector: 'Tech',       color: '#a78bfa' },
  { ticker: 'PME',  name: 'Pro Medicus',        price:224.80, change:  3.44, sector: 'Healthtech', color: '#a78bfa' },
]

const GHOST_FALLERS = [
  { ticker: 'IGO',  name: 'IGO Limited',        price:  4.82, change: -4.63, sector: 'Lithium',   color: '#ff4f4f' },
  { ticker: 'AGL',  name: 'AGL Energy',         price:  9.74, change: -6.82, sector: 'Energy',    color: '#f97316' },
  { ticker: 'FLT',  name: 'Flight Centre',      price: 17.08, change: -4.91, sector: 'Travel',    color: '#ff4f4f' },
  { ticker: 'WHC',  name: 'Whitehaven Coal',    price:  6.72, change: -2.98, sector: 'Energy',    color: '#f97316' },
  { ticker: 'BOE',  name: 'Boss Energy',        price:  2.94, change: -4.21, sector: 'Uranium',   color: '#f97316' },
]

const GHOST_TOP_STOCKS = [
  { ticker: 'CBA',  name: 'Commonwealth Bank',   price: 162.40, change:  1.82, color: '#5b8af5' },
  { ticker: 'BHP',  name: 'BHP Group',           price:  44.82, change: -0.94, color: '#2ed494' },
  { ticker: 'CSL',  name: 'CSL Limited',         price: 298.40, change:  1.14, color: '#a78bfa' },
  { ticker: 'NAB',  name: 'National Australia',  price:  38.92, change:  0.44, color: '#5b8af5' },
  { ticker: 'WBC',  name: 'Westpac Banking',     price:  29.18, change:  0.71, color: '#5b8af5' },
  { ticker: 'MQG',  name: 'Macquarie Group',     price: 224.60, change: -0.88, color: '#e8b84b' },
  { ticker: 'WDS',  name: 'Woodside Energy',     price:  24.12, change:  2.81, color: '#f97316' },
  { ticker: 'ANZ',  name: 'ANZ Group',           price:  30.48, change:  0.62, color: '#5b8af5' },
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

function SectionHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono"
        style={{ color: 'var(--text-secondary)' }}>{title}</span>
      {note && (
        <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-md"
          style={{ color: 'rgba(232,184,75,0.5)', background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.12)' }}>
          {note}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const asxChange = GHOST_ASX.change

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4 space-y-6">

        {/* ── ASX 200 Hero ─────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden relative chart-grid"
          style={{
            background: 'linear-gradient(145deg, #111826 0%, #0a1020 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 100% 70% at 20% 0%, rgba(34,212,138,0.06) 0%, transparent 60%)' }} />

          <div className="relative p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[9px] font-mono font-bold tracking-[0.20em] uppercase mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>S&P / ASX 200 INDEX</div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono font-bold" style={{ fontSize: 32, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                    {fmt(GHOST_ASX.price, 1)}
                  </span>
                  <ChangeChip change={asxChange} />
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md flex items-center gap-1"
                    style={{ background: 'rgba(232,184,75,0.08)', color: 'rgba(232,184,75,0.55)', border: '1px solid rgba(232,184,75,0.15)' }}>
                    SIMULATED
                  </span>
                </div>
                <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  ▲ {fmt(GHOST_ASX.changeAbs, 1)} pts · {new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
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
                      <stop offset="0%"   stopColor="#22d48a" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#22d48a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#22d48a" strokeWidth={2}
                    fill="url(#asx-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────── */}
        <div>
          <SectionHeader title="Global Indices" note="SIMULATED" />
          <div className="grid grid-cols-2 gap-2">
            {GHOST_INDICES.map((idx) => (
              <div key={idx.name} className="rounded-2xl p-3.5"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}>{idx.name}</div>
                <div className="font-mono font-bold text-[16px]" style={{ letterSpacing: '-0.01em' }}>
                  {fmt(idx.value, idx.name === 'Nikkei' ? 0 : 2)}
                </div>
                <div className="mt-1.5"><ChangeChip change={idx.change} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sector Performance ────────────────────────────── */}
        <div>
          <SectionHeader title="Sector Performance" note="SIMULATED" />
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

        {/* ── Today's Movers ────────────────────────────────── */}
        <div>
          <SectionHeader title="Today's Top Gainers" note="SIMULATED" />
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {GHOST_GAINERS.map((m, i) => (
              <div key={m.ticker} className="flex items-center gap-3 px-4 py-3"
                style={{ background: 'var(--bg-2)', borderBottom: i < GHOST_GAINERS.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                  style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 38, height: 38, background: `${m.color}14`, border: `1px solid ${m.color}28` }}>
                  <span className="font-mono font-bold text-[9px]" style={{ color: m.color }}>{m.ticker}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px]">{m.ticker}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[13px]">${fmt(m.price)}</div>
                  <div className="font-mono font-bold text-[11px]" style={{ color: 'var(--green)' }}>
                    ▲ {m.change.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title="Today's Top Fallers" note="SIMULATED" />
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {GHOST_FALLERS.map((m, i) => (
              <div key={m.ticker} className="flex items-center gap-3 px-4 py-3"
                style={{ background: 'var(--bg-2)', borderBottom: i < GHOST_FALLERS.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <span className="font-mono text-[10px] w-4 text-right flex-shrink-0"
                  style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                  style={{ width: 38, height: 38, background: `${m.color}14`, border: `1px solid ${m.color}28` }}>
                  <span className="font-mono font-bold text-[9px]" style={{ color: m.color }}>{m.ticker}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px]">{m.ticker}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[13px]">${fmt(m.price)}</div>
                  <div className="font-mono font-bold text-[11px]" style={{ color: 'var(--red)' }}>
                    ▼ {Math.abs(m.change).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Commodities ───────────────────────────────────── */}
        <div>
          <SectionHeader title="Commodities" note="SIMULATED" />
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {GHOST_COMMODITIES.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between px-4 py-3"
                style={{ background: 'var(--bg-2)', borderBottom: i < GHOST_COMMODITIES.length - 1 ? '1px solid var(--line)' : 'none' }}>
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
        </div>

        {/* ── FX ───────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Foreign Exchange" note="SIMULATED" />
          <div className="grid grid-cols-2 gap-2">
            {GHOST_FX.map((fx) => (
              <div key={fx.pair} className="rounded-2xl p-3.5"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}>{fx.pair}</div>
                <div className="font-mono font-bold text-[16px] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                  {fmt(fx.value, fx.pair.includes('JPY') ? 3 : 4)}
                </div>
                <ChangeChip change={fx.change} />
              </div>
            ))}
          </div>
        </div>

        {/* ── ASX Top Stocks ────────────────────────────────── */}
        <div>
          <SectionHeader title="ASX Top Stocks" note="SIMULATED" />
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {GHOST_TOP_STOCKS.map((m, i) => (
              <div key={m.ticker} className="flex items-center gap-3 px-4 py-3"
                style={{ background: 'var(--bg-2)', borderBottom: i < GHOST_TOP_STOCKS.length - 1 ? '1px solid var(--line)' : 'none' }}>
                <div className="flex items-center justify-center font-mono text-[10px] font-bold rounded-lg"
                  style={{
                    width: 40, height: 28,
                    background: (m.change ?? 0) >= 0 ? 'var(--green-a)' : 'var(--red-a)',
                    border: `1px solid ${(m.change ?? 0) >= 0 ? 'var(--green-b)' : 'var(--red-b)'}`,
                    color: (m.change ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
                    letterSpacing: '0.04em',
                  }}>
                  {m.ticker}
                </div>
                <span className="flex-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-[13px]">${fmt(m.price)}</span>
                  <ChangeChip change={m.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            All figures are simulated placeholder data · Not financial advice
          </p>
        </div>

      </div>
    </div>
  )
}
