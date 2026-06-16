'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexData    { name: string; value: number | null; change: number | null; changeAbs: number | null }
interface CommodityData{ name: string; unit: string; value: number | null; change: number | null }
interface FXData       { pair: string; value: number | null; change: number | null; source: string | null }
interface MoverData    { ticker: string; name: string; price: number | null; change: number | null; changeAbs: number | null }
interface ASXData      { price: number; change: number; changeAbs: number }

interface MarketSummary {
  indices:     IndexData[]
  commodities: CommodityData[]
  fx:          FXData[]
  topMovers:   MoverData[]
  asx:         ASXData | null
  meta:        { hasAnyLive: boolean; dataSource: string; fetchedAt: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null, decimals = 2) {
  if (n === null) return '—'
  return n.toLocaleString('en-AU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function ChangeChip({ change }: { change: number | null }) {
  if (change === null) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
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

function SectionHeader({ title, live }: { title: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono"
        style={{ color: 'var(--text-secondary)' }}>{title}</span>
      {live !== undefined && (
        <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded-md"
          style={live
            ? { color: '#2ed494', background: 'rgba(46,212,148,0.08)', border: '1px solid rgba(46,212,148,0.2)' }
            : { color: 'rgba(232,184,75,0.5)', background: 'rgba(232,184,75,0.06)', border: '1px solid rgba(232,184,75,0.12)' }}>
          {live ? 'LIVE' : 'SIMULATED'}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

function Skeleton({ h = 48, rounded = 'rounded-xl' }: { h?: number; rounded?: string }) {
  return <div className={`${rounded} animate-pulse`} style={{ height: h, background: 'var(--bg-3)' }} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const router  = useRouter()
  const [data,    setData]    = useState<MarketSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market/summary')
      .then(r => r.ok ? r.json() : null)
      .then((d: MarketSummary | null) => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const live   = data?.meta?.hasAnyLive ?? false
  const asx    = data?.asx
  const asxUp  = (asx?.change ?? 0) >= 0

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4 space-y-6">

        {/* ── ASX 200 Hero ──────────────────────────────────────────────── */}
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

                {loading || !asx ? (
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

                {asx && (
                  <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    {asxUp ? '▲' : '▼'} {fmt(Math.abs(asx.changeAbs), 1)} pts · {new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              {/* RBA Rate */}
              <div className="text-right flex flex-col items-end gap-1 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(232,184,75,0.07)', border: '1px solid rgba(232,184,75,0.16)' }}>
                <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>RBA Rate</div>
                <div className="font-mono text-[20px] font-bold" style={{ color: 'var(--gold)', letterSpacing: '-0.02em' }}>4.10%</div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>Unchanged</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Global Indices ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Global Indices" live={live} />
          {loading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <Skeleton key={i} h={72} rounded="rounded-2xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(data?.indices ?? []).map(idx => (
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

        {/* ── ASX Top Movers ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="ASX Top Stocks" live={live} />
          {loading ? (
            <Skeleton h={280} rounded="rounded-2xl" />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {(data?.topMovers ?? []).map((m, i, arr) => (
                <button key={m.ticker}
                  onClick={() => router.push(`/asset/${m.ticker}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: 'var(--bg-2)', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div className="flex items-center justify-center font-mono text-[10px] font-bold rounded-lg flex-shrink-0"
                    style={{
                      width: 40, height: 28,
                      background: (m.change ?? 0) >= 0 ? 'var(--green-a)' : 'var(--red-a)',
                      border: `1px solid ${(m.change ?? 0) >= 0 ? 'var(--green-b)' : 'var(--red-b)'}`,
                      color: (m.change ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
                      letterSpacing: '0.04em',
                    }}>
                    {m.ticker}
                  </div>
                  <span className="flex-1 text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="font-mono font-bold text-[13px]">
                      {m.price !== null ? `$${fmt(m.price)}` : '—'}
                    </span>
                    <ChangeChip change={m.change} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Commodities ────────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Commodities" live={live} />
          {loading ? (
            <Skeleton h={180} rounded="rounded-2xl" />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {(data?.commodities ?? []).map((c, i, arr) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-3"
                  style={{ background: 'var(--bg-2)', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span className="text-[13px] font-semibold">{c.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-[13px]">
                      {c.value !== null ? `$${fmt(c.value)}` : '—'}
                      {c.value !== null && <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit}</span>}
                    </span>
                    <ChangeChip change={c.change} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Foreign Exchange ───────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Foreign Exchange" live={live} />
          {loading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <Skeleton key={i} h={72} rounded="rounded-2xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(data?.fx ?? []).map(fx => (
                <div key={fx.pair} className="rounded-2xl p-3.5"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                    style={{ color: 'var(--text-muted)' }}>{fx.pair}</div>
                  <div className="font-mono font-bold text-[16px] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                    {fmt(fx.value, fx.pair.includes('JPY') ? 2 : 4)}
                  </div>
                  <ChangeChip change={fx.change} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {live
              ? `Live data via Twelve Data · ${data?.meta?.fetchedAt ? new Date(data.meta.fetchedAt).toLocaleTimeString('en-AU') : ''}`
              : 'Figures may be simulated · Not financial advice'
            }
          </p>
        </div>

      </div>
    </div>
  )
}
