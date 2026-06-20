'use client'

import { useEffect, useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from 'lucide-react'
import type { MarketSource, MarketSummaryResponse } from '@/lib/market/types'
import { sourceLabel, freshnessLabel } from '@/lib/market/types'

// ─── Static reference (not market data) ──────────────────────────────────────
// RBA cash rate — policy figure with no free live feed; labelled static value.
// Source: rba.gov.au (effective 6 May 2026).
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
  const [data,    setData]    = useState<MarketSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function load() {
    setLoading(true); setError(false)
    fetch('/api/market/summary', { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d: MarketSummaryResponse) => {
        // Keep the last good payload if a refresh returns empty/rate-limited, so a
        // transient Twelve Data blip never blanks an already-populated page.
        setData(prev => (!d.meta?.hasAnyLive && prev?.meta?.hasAnyLive) ? prev : d)
        if (!d.meta?.hasAnyLive) {
          clearTimeout(retryTimer.current)
          retryTimer.current = setTimeout(load, 20000)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => { clearInterval(id); clearTimeout(retryTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meta  = data?.meta
  const live  = meta?.hasAnyLive ?? false
  const aud   = data?.asx
  const audUp = (aud?.change ?? 0) >= 0

  const updatedLabel = loading && !data
    ? 'Loading market data…'
    : live && meta?.fetchedAt
      ? `Updated ${new Date(meta.fetchedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
      : 'Data temporarily unavailable'

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
            Live prices are briefly rate-limited on the Twelve Data free tier. Showing the last values where
            available; they refresh automatically.
          </Notice>
        )}
        {meta && !meta.tdKeyPresent && (
          <Notice tone="info">
            Live commodity/crypto feed (Twelve Data) isn&apos;t configured. Set <span className="font-mono">TWELVE_DATA_API_KEY</span> to enable it.
          </Notice>
        )}
        {!loading && data && !live && (
          <Notice tone="warn">Market data sources are temporarily unreachable. Tap refresh to try again.</Notice>
        )}

        {/* ── Hero: AUD/USD ────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden relative"
          style={{
            background: 'linear-gradient(145deg, #111826 0%, #0a1020 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
          }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 100% 70% at 20% 0%, ${audUp ? 'rgba(34,212,138,0.06)' : 'rgba(255,79,79,0.06)'} 0%, transparent 60%)` }} />
          <div className="relative p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] font-mono font-bold tracking-[0.20em] uppercase mb-2"
                  style={{ color: 'var(--text-muted)' }}>AUD / USD</div>
                {loading && !data ? <Skel h={36} cls="rounded-lg w-44" /> : aud ? (
                  <>
                    <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                      <span className="font-mono font-bold" style={{ fontSize: 32, letterSpacing: '-0.03em' }}>
                        {n(aud.price, 4)}
                      </span>
                      <ChangeChip change={aud.change} />
                      <SourceChip source={meta?.sources.fx} />
                    </div>
                    <div className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Australian Dollar · ECB reference rate
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
                      {c.value !== null && <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{c.unit} USD</span>}
                    </span>
                    <ChangeChip change={c.change} />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyRow label="Commodity data" />}
        </div>

        {/* ── Crypto ────────────────────────────────────────── */}
        <div>
          <Hd title="Crypto · USD" right={<SourceChip source={meta?.sources.crypto} />} />
          {loading && !data ? <Skel h={160} cls="rounded-2xl" /> : (data?.crypto ?? []).some(c => c.price !== null) ? (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
              {(data?.crypto ?? []).map((c, i, arr) => (
                <div key={c.symbol} className="flex items-center justify-between px-4 py-3"
                  style={{ background: 'var(--bg-2)', borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <div>
                    <div className="text-[13px] font-semibold">{c.name}</div>
                    <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{c.symbol}</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-[13px]">{c.price !== null ? `$${n(c.price, c.price < 10 ? 4 : 2)}` : '—'}</span>
                    <ChangeChip change={c.change} />
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyRow label="Crypto data" />}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="text-center pb-4 space-y-1">
          <p className="text-[10px] font-mono leading-relaxed" style={{ color: 'var(--text-faint)' }}>
            {live
              ? <>FX: ECB reference · commodities &amp; crypto: Twelve Data (USD)</>
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
