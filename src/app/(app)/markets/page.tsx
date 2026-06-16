'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from 'lucide-react'
import type { MarketSource, MarketSummaryResponse } from '@/lib/market/types'
import { sourceLabel, freshnessLabel } from '@/lib/market/types'

// ─── Static reference (not market data) ──────────────────────────────────────
// RBA cash rate is a policy figure with no free live feed. Shown as a clearly
// labelled static reference with its effective date — never as "live" data.
// Source: https://www.rba.gov.au/statistics/cash-rate/  (effective 6 May 2026)
const RBA_RATE = '4.35%'
const RBA_SINCE = 'since 6 May 2026'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: number | null | undefined, dec = 2) {
  if (v === null || v === undefined) return '—'
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

/** Provenance + freshness chip (Live · Twelve Data / Delayed · Stooq / Daily · ECB). */
function SourceChip({ source }: { source: MarketSource | undefined }) {
  if (!source || source === 'none') return null
  const live   = source === 'twelvedata'
  const color  = live ? 'var(--green)' : 'var(--text-muted)'
  const bg     = live ? 'var(--green-a)' : 'var(--bg-4)'
  const border = live ? 'var(--green-b)' : 'var(--line)'
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded-md flex-shrink-0"
      style={{ color, background: bg, border: `1px solid ${border}` }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {freshnessLabel(source)} · {sourceLabel(source)}
    </span>
  )
}

function Hd({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] font-mono"
        style={{ color: 'var(--text-secondary)' }}>{title}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      {right}
    </div>
  )
}

function Skel({ h = 48, cls = 'rounded-xl' }: { h?: number; cls?: string }) {
  return <div className={`${cls} animate-pulse`} style={{ height: h, background: 'var(--bg-3)' }} />
}

function Notice({ tone, children }: { tone: 'warn' | 'info'; children: ReactNode }) {
  const color  = tone === 'warn' ? 'var(--gold)' : 'var(--text-muted)'
  const bg     = tone === 'warn' ? 'rgba(232,184,75,0.08)' : 'var(--bg-2)'
  const border = tone === 'warn' ? 'rgba(232,184,75,0.22)' : 'var(--line)'
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <AlertTriangle size={13} style={{ color, marginTop: 1, flexShrink: 0 }} />
      <span className="text-[11px] leading-snug" style={{ color: 'var(--text-secondary)' }}>{children}</span>
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="text-center py-6 text-[12px]" style={{ color: 'var(--text-muted)' }}>
      {label} unavailable right now — tap refresh to retry
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const router = useRouter()
  const [data,    setData]    = useState<MarketSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  function load() {
    setLoading(true); setError(false)
    fetch('/api/market/summary', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d: MarketSummaryResponse) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000) // auto-refresh every 5 min
    return () => clearInterval(id)
  }, [])

  const meta    = data?.meta
  const live    = meta?.hasAnyLive ?? false
  const asx     = data?.asx
  const asxUp   = (asx?.change ?? 0) >= 0
  const gainers = (data?.topMovers ?? []).filter(m => (m.change ?? 0) > 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
  const fallers = (data?.topMovers ?? []).filter(m => (m.change ?? 0) < 0).sort((a, b) => (a.change ?? 0) - (b.change ?? 0))

  const updatedLabel = loading && !data
    ? 'Loading market data…'
    : live && meta?.fetchedAt
      ? `Updated ${new Date(meta.fetchedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
      : 'Data temporarily unavailable'

  // Hard failure (route unreachable / non-2xx)
  if (error && !data) return (
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

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold" style={{ letterSpacing: '-0.01em' }}>Markets</h1>
            <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{updatedLabel}</p>
          </div>
          <button onClick={load} disabled={loading} aria-label="Refresh market data"
            className="flex items-center justify-center rounded-xl active:scale-95 transition-transform"
            style={{ width: 38, height: 38, background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* ── Status banners ─────────────────────────────────── */}
        {meta?.tdRateLimited && (
          <Notice tone="warn">
            Live FX &amp; commodity prices are rate-limited on the Twelve Data free tier right now.
            Showing reference rates where available; they&apos;ll refresh automatically.
          </Notice>
        )}
        {meta && !meta.tdKeyPresent && (
          <Notice tone="info">
            Live FX &amp; commodity feed (Twelve Data) isn&apos;t configured. Showing ECB and exchange
            reference data. Set <span className="font-mono">TWELVE_DATA_API_KEY</span> to enable live pricing.
          </Notice>
        )}
        {!loading && data && !live && (
          <Notice tone="warn">All market data sources are temporarily unreachable. Tap refresh to try again.</Notice>
        )}

        {/* ── ASX 200 Hero ─────────────────────────────────────────── */}
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
                  style={{ color: 'var(--text-muted)' }}>S&amp;P / ASX 200 INDEX</div>
                {loading && !data ? <Skel h={36} cls="rounded-lg w-44" /> : asx ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                      <span className="font-mono font-bold" style={{ fontSize: 32, letterSpacing: '-0.03em' }}>
                        {n(asx.price, 1)}
                      </span>
                      <ChangeChip change={asx.change} />
                      <SourceChip source={meta?.sources.indices} />
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {asxUp ? '▲' : '▼'} {n(Math.abs(asx.changeAbs ?? 0), 1)} pts
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-[13px] mt-2" style={{ color: 'var(--text-muted)' }}>No data available</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(232,184,75,0.07)', border: '1px solid rgba(232,184,75,0.16)' }}>
                <div className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>RBA Rate</div>
                <div className="font-mono text-[20px] font-bold" style={{ color: 'var(--gold)', letterSpacing: '-0.02em' }}>{RBA_RATE}</div>
                <div className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>{RBA_SINCE}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Global Indices ────────────────────────────────── */}
        <div>
          <Hd title="Global Indices" right={<SourceChip source={meta?.sources.indices} />} />
          {loading && !data ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <Skel key={i} h={76} cls="rounded-2xl" />)}</div>
          ) : (data?.indices ?? []).some(i => i.value !== null) ? (
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
            </div>
          ) : <EmptyRow label="Index data" />}
        </div>

        {/* ── Today's Gainers ───────────────────────────────── */}
        {(( loading && !data) || gainers.length > 0) && (
          <div>
            <Hd title="Today's Top Gainers" right={<SourceChip source={meta?.sources.stocks} />} />
            {loading && !data ? <Skel h={200} cls="rounded-2xl" /> : (
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
        {(( loading && !data) || fallers.length > 0) && (
          <div>
            <Hd title="Today's Top Fallers" right={<SourceChip source={meta?.sources.stocks} />} />
            {loading && !data ? <Skel h={200} cls="rounded-2xl" /> : (
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
          <Hd title="Commodities" right={<SourceChip source={meta?.sources.commodities} />} />
          {loading && !data ? <Skel h={160} cls="rounded-2xl" /> : (data?.commodities ?? []).some(c => c.value !== null) ? (
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
          ) : <EmptyRow label="Commodity data" />}
        </div>

        {/* ── Foreign Exchange ──────────────────────────────── */}
        <div>
          <Hd title="Foreign Exchange" right={<SourceChip source={meta?.sources.fx} />} />
          {loading && !data ? (
            <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map(i => <Skel key={i} h={76} cls="rounded-2xl" />)}</div>
          ) : (data?.fx ?? []).some(f => f.value !== null) ? (
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
          ) : <EmptyRow label="FX data" />}
        </div>

        {/* ── ASX Top Stocks ────────────────────────────────── */}
        {(( loading && !data) || (data?.topMovers ?? []).some(m => m.price !== null)) && (
          <div>
            <Hd title="ASX Top Stocks" right={<SourceChip source={meta?.sources.stocks} />} />
            {loading && !data ? <Skel h={280} cls="rounded-2xl" /> : (
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
        <div className="text-center pb-4 space-y-1">
          <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--text-faint)' }}>
            {live
              ? <>FX &amp; commodities: Twelve Data · indices &amp; ASX stocks: Stooq (delayed)</>
              : 'Market data unavailable'}
          </p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
            {meta?.fetchedAt ? `As at ${new Date(meta.fetchedAt).toLocaleString('en-AU', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })} · ` : ''}
            Not financial advice
          </p>
        </div>

      </div>
    </div>
  )
}
