'use client'

import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ── Mock data ────────────────────────────────────────────────────────
const ASX_HISTORY = [8080,8090,8075,8060,8095,8110,8125,8108,8118,8135,8142]

const INDICES = [
  { name: 'ASX 200',  value: '8,142.3', change: -0.43, abs: '-35.2' },
  { name: 'S&P 500',  value: '5,648.2', change: 0.24,  abs: '+13.4' },
  { name: 'Nikkei',   value: '38,421',  change: -1.12, abs: '-435' },
  { name: 'FTSE 100', value: '8,201.4', change: 0.51,  abs: '+41.6' },
]

const COMMODITIES = [
  { name: 'Gold',       value: '$3,298', unit: '/oz',  change: 0.42 },
  { name: 'Iron Ore',   value: '$102.4', unit: '/t',   change: -1.80 },
  { name: 'WTI Oil',    value: '$68.30', unit: '/bbl', change: -0.72 },
  { name: 'Copper',     value: '$4.21',  unit: '/lb',  change: 1.14 },
  { name: 'Coking Coal',value: '$224',   unit: '/t',   change: -0.55 },
  { name: 'LNG',        value: '$12.40', unit: '/MMBtu', change: 2.30 },
]

const FX = [
  { pair: 'AUD/USD', value: '0.6412', change: -0.23 },
  { pair: 'AUD/CNY', value: '4.6523', change: -0.18 },
  { pair: 'AUD/JPY', value: '96.84',  change: -1.02 },
  { pair: 'AUD/EUR', value: '0.5921', change: 0.11 },
]

const SECTORS = [
  { name: 'Energy',     change: 1.82 },
  { name: 'Materials',  change: -1.21 },
  { name: 'Financials', change: 0.94 },
  { name: 'Health',     change: -0.38 },
  { name: 'Tech',       change: 2.14 },
  { name: 'REITs',      change: -0.67 },
  { name: 'Utilities',  change: 0.22 },
  { name: 'Consumer',   change: -0.85 },
]

const TOP_MOVERS = [
  { ticker: 'WDS',  name: 'Woodside Energy', price: '24.12', change: 2.81 },
  { ticker: 'CBA',  name: 'Commonwealth Bank', price: '162.40', change: 1.82 },
  { ticker: 'RIO',  name: 'Rio Tinto', price: '118.40', change: 1.95 },
  { ticker: 'BHP',  name: 'BHP Group', price: '44.82', change: -2.30 },
  { ticker: 'FMG',  name: 'Fortescue', price: '18.92', change: -1.74 },
]

function ChangeChip({ change }: { change: number }) {
  const positive = change > 0
  const neutral = change === 0
  const color = neutral ? 'var(--text-muted)' : positive ? 'var(--green)' : 'var(--red)'
  const bg = neutral ? 'var(--bg-4)' : positive ? 'var(--green-a)' : 'var(--red-a)'
  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded"
      style={{ color, background: bg }}
    >
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

export default function MarketsPage() {
  const asxChange = -0.43
  const asxChartData = ASX_HISTORY.map((v) => ({ v }))

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4 space-y-5">

        {/* ── ASX 200 Hero ─────────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden relative chart-grid"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(7,9,26,0.2) 0%, transparent 50%, rgba(7,9,26,0.6) 100%)' }}
          />
          <div className="relative p-4">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                  ASX 200
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-mono font-semibold" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                    8,142.3
                  </span>
                  <ChangeChip change={asxChange} />
                </div>
                <div className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  ▼ 35.2 pts · As at market close
                </div>
              </div>
              <div className="text-right">
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
                      <stop offset="0%" stopColor="#ff5252" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#ff5252" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#ff5252" strokeWidth={1.5} fill="url(#asx-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────────── */}
        <div>
          <SectionHeader title="Global Indices" />
          <div className="grid grid-cols-2 gap-2">
            {INDICES.map((idx) => (
              <div
                key={idx.name}
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <div className="text-[10px] font-mono tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                  {idx.name}
                </div>
                <div className="font-mono font-semibold text-[15px]">{idx.value}</div>
                <div className="mt-1">
                  <ChangeChip change={idx.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sector Performance ────────────────────────────────── */}
        <div>
          <SectionHeader title="Sector Performance" />
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', height: 120 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SECTORS} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barSize={18}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 8, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    background: 'var(--bg-4)',
                    border: '1px solid var(--line-2)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  formatter={(v: number) => [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, '']}
                />
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
            {COMMODITIES.map((c) => (
              <div
                key={c.name}
                className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <span className="text-[13px] font-medium">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px]">
                    {c.value}
                    <span className="text-[10px] ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit}</span>
                  </span>
                  <ChangeChip change={c.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FX ───────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Foreign Exchange" />
          <div className="grid grid-cols-2 gap-2">
            {FX.map((fx) => (
              <div
                key={fx.pair}
                className="rounded-xl p-3"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <div className="text-[10px] font-mono tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  {fx.pair}
                </div>
                <div className="font-mono font-semibold text-[15px] mb-1">{fx.value}</div>
                <ChangeChip change={fx.change} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Top Movers ────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Top Movers" />
          <div className="space-y-1.5">
            {TOP_MOVERS.map((m) => (
              <div
                key={m.ticker}
                className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="font-mono text-[11px] font-bold px-2 py-0.5 rounded"
                    style={{
                      background: m.change >= 0 ? 'var(--green-a)' : 'var(--red-a)',
                      color: m.change >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {m.ticker}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px]">${m.price}</span>
                  <ChangeChip change={m.change} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
