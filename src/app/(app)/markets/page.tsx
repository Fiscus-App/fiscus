'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndexRow     { name: string; value: number | null; change: number | null; changeAbs: number | null }
interface CommodityRow { name: string; unit: string; value: number | null; change: number | null }
interface FXRow        { pair: string; value: number | null; change: number | null }
interface MoverRow     { ticker: string; name: string; price: number | null; change: number | null; changeAbs: number | null }

interface Summary {
  indices:     IndexRow[]
  commodities: CommodityRow[]
  fx:          FXRow[]
  topMovers:   MoverRow[]
  asx:         { price: number; change: number; changeAbs: number } | null
  meta:        { hasAnyLive: boolean; fetchedAt: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: number | null, dec = 2) {
  if (v === null) return '—'
  return v.toLocaleString('en-AU', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function ChangeChip({ change }: { change: number | null }) {
  if (change === null) return <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>—</span>
  const up = change > 0; const flat = change === 0
  const color  = flat ? 'var(--text-muted)' : up ? 'var(--green)' : 'var(--red)'
  const bg     = flat ? 'var(--bg-4)'       : up ? 'var(--green-a)' : 'var(--red-a)'
  const border = flat ? 'var(--line)'       : up ? 'var(--green-b)' : 'var(--red-b)'
  const Icon   = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
      style={{ color, background: bg, border: `1px solid ${border}` }}>
      <Icon size={10} strokeWidth={2.5} />
      {up ? '+' : ''}{change.toFixed(2)}%
    </span>
  )
}

function Hd({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono"
        style={{ color: 'var(--text-secondary)' }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
    </div>
  )
}

function Skel({ h = 48, cls = 'rounded-xl' }: { h?: number; cls?: string }) {
  return <div className={`${cls} animate-pulse`} style={{ height: h, background: 'var(--bg-3)' }} />
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const router = useRouter()
  const [data,    setData]    = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  function load() {
    setLoading(true); setError(false)
    fetch('/api/market/summary')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: Summary) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const live    = data?.meta?.hasAnyLive ?? false
  const asx     = data?.asx
  const asxUp   = (asx?.change ?? 0) >= 0
  const gainers = (data?.topMovers ?? []).filter(m => (m.change ?? 0) > 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
  const fallers = (data?.topMovers ?? []).filter(m => (m.change ?? 0) < 0).sort((a, b) => (a.change ?? 0) - (b.change ?? 0))

  if (error) return (
    <div className="h-full flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)' }}>
      <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>Could not load market data</p>
      <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold"
        style={{ background: 'var(--bg-3)', color: 'var(--text-primary)', border: '1px solid var(--line)' }}>
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  )

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
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] font-mono font-bold tracking-[0.20em] uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}>S&P / ASX 200 INDEX</div>
                {loading ? <Skel h={36} cls="rounded-lg w-44" /> : asx ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-mono font-bold" style={{ fontSize: 32, letterSpacing: '-0.03em' }}>
                        {n(asx.price, 1)}
                      </span>
                      <ChangeChip change={asx.change} />
                      {live && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(46,212,148,0.1)', color: '#2ed494', border: '1px solid rgba(46,212,148,0.2)' }}>LIVE</span>}
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {asxUp ? '▲' : '▼'} {n(Math.abs(asx.changeAbs), 1)} pts
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-[13px] mt-2" style={{ color: 'var(--text-muted)' }}>No data available</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(232,184,75,0.07)', border: '1px solid rgba(232,184,75,0.16)' }}>
                <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>RBA Rate</div>
                <div className="font-mono text-[20px] font-bold" style={{ color: 'var(--gold)', letterSpacing: '-0.02em' }}>4.10%</div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>Unchanged</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────── */}
        <div>
          <Hd title="Global Indices" />
          {loading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <Skel key={i} h={76} cls="rounded-2xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(data?.indices ?? []).map(idx => (
                <div key={idx.name} className="rounded-2xl p-3.5"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                    style={{ color: 'var(--text-muted)' }}>{idx.name}</div>
                  <div className="font-mono font-bold text-[16px] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                    {n(idx.value, idx.name === 'Nikkei' ? 0 : 1)}
                  </div>
                  <ChangeChip change={idx.change} />
                </div>
              ))}
              {!data?.indices?.length && !loading && (
                <div className="col-span-2 text-center py-6 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  No index data available
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Today's Gainers ───────────────────────────────── */}
        {(loading || gainers.length > 0) && (
          <div>
            <Hd title="Today's Top Gainers" />
            {loading ? <Skel h={200} cls="rounded-2xl" /> : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                {gainers.map((m, i) => (
                  <button key={m.ticker} onClick={() => router.push(`/asset/${m.ticker}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{ background: 'var(--bg-2)', borderBottom: i < gainers.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span className="font-mono text-[10px] w-4 text-right flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                    <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{ width: 38, height: 38, background: 'var(--green-a)', border: '1px solid var(--green-b)' }}>
                      <span className="font-mono font-bold text-[9px]" style={{ color: 'var(--green)' }}>{m.ticker}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13px]">{m.ticker}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-[13px]">{m.price !== null ? `$${n(m.price)}` : '—'}</div>
                      <div className="font-mono font-bold text-[11px]" style={{ color: 'var(--green)' }}>
                        ▲ {(m.change ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Today's Fallers ───────────────────────────────── */}
        {(loading || fallers.length > 0) && (
          <div>
            <Hd title="Today's Top Fallers" />
            {loading ? <Skel h={200} cls="rounded-2xl" /> : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                {fallers.map((m, i) => (
                  <button key={m.ticker} onClick={() => router.push(`/asset/${m.ticker}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    style={{ background: 'var(--bg-2)', borderBottom: i < fallers.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span className="font-mono text-[10px] w-4 text-right flex-shrink-0" style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                    <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{ width: 38, height: 38, background: 'var(--red-a)', border: '1px solid var(--red-b)' }}>
                      <span className="font-mono font-bold text-[9px]" style={{ color: 'var(--red)' }}>{m.ticker}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13px]">{m.ticker}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{m.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-[13px]">{m.price !== null ? `$${n(m.price)}` : '—'}</div>
                      <div className="font-mono font-bold text-[11px]" style={{ color: 'var(--red)' }}>
                        ▼ {Math.abs(m.change ?? 0).toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Commodities ───────────────────────────────────── */}
        <div>
          <Hd title="Commodities" />
          {loading ? <Skel h={200} cls="rounded-2xl" /> : (data?.commodities ?? []).length > 0 ? (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {(data?.commodities ?? []).map((c, i, arr) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-3"
                  style={{ background: 'var(--bg-2)', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span className="text-[13px] font-semibold">{c.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-[13px]">
                      {c.value !== null ? `$${n(c.value)}` : '—'}
                      {c.value !== null && <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit}</span>}
                    </span>
                    <ChangeChip change={c.change} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[13px]" style={{ color: 'var(--text-muted)' }}>No commodity data available</div>
          )}
        </div>

        {/* ── Foreign Exchange ──────────────────────────────── */}
        <div>
          <Hd title="Foreign Exchange" />
          {loading ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <Skel key={i} h={76} cls="rounded-2xl" />)}</div>
          ) : (data?.fx ?? []).length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {(data?.fx ?? []).map(f => (
                <div key={f.pair} className="rounded-2xl p-3.5"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div className="text-[9px] font-mono tracking-[0.14em] uppercase mb-2"
                    style={{ color: 'var(--text-muted)' }}>{f.pair}</div>
                  <div className="font-mono font-bold text-[16px] mb-1.5" style={{ letterSpacing: '-0.01em' }}>
                    {n(f.value, f.pair.includes('JPY') ? 3 : 4)}
                  </div>
                  <ChangeChip change={f.change} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[13px]" style={{ color: 'var(--text-muted)' }}>No FX data available</div>
          )}
        </div>

        {/* ── ASX Top Stocks ────────────────────────────────── */}
        {(loading || (data?.topMovers ?? []).length > 0) && (
          <div>
            <Hd title="ASX Top Stocks" />
            {loading ? <Skel h={280} cls="rounded-2xl" /> : (
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                {(data?.topMovers ?? []).map((m, i, arr) => (
                  <button key={m.ticker} onClick={() => router.push(`/asset/${m.ticker}`)}
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
                      <span className="font-mono font-bold text-[13px]">{m.price !== null ? `$${n(m.price)}` : '—'}</span>
                      <ChangeChip change={m.change} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {live && data?.meta?.fetchedAt
              ? `Live · Twelve Data · ${new Date(data.meta.fetchedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
              : 'Market data unavailable · Not financial advice'}
          </p>
        </div>

      </div>
    </div>
  )
}
