'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowUpRight, Clock } from 'lucide-react'

interface Stock {
  ticker: string
  name: string
  sector: string
  sectorColor: string
}

interface Article {
  id: string
  title: string
  summary: string | null
  sector: string | null
  relatedTickers: string[]
  publishedAt: string
  source: { name: string }
}

interface DiscoverStock {
  ticker: string
  name: string
  sector: string
  sectorColor: string
  change: number
  price: number
  volume?: string
  note?: string
}

interface DiscoverCategory {
  id: string
  label: string
  icon: string
  stocks: DiscoverStock[]
  ghost: true
}

interface SearchResults {
  stocks: Stock[]
  articles: Article[]
  trending: DiscoverCategory[] | null
}

const RECENT_KEY = 'fiscus_recent_searches'

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function addRecent(q: string) {
  const prev = getRecent().filter(x => x !== q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 6)))
}
function clearRecent() {
  localStorage.removeItem(RECENT_KEY)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function SearchPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<SearchResults | null>(null)
  const [loading, setLoading]   = useState(false)
  const [recent, setRecent]     = useState<string[]>([])

  // Load recent on mount + focus input
  useEffect(() => {
    setRecent(getRecent())
    inputRef.current?.focus()
  }, [])

  // Debounced search
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults({ stocks: [], articles: [], trending: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) {
      setLoading(false)
      doSearch('') // load trending
      return
    }
    timerRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  function handleSelect(q: string) {
    addRecent(q)
    setRecent(getRecent())
    setQuery(q)
  }

  function handleStockTap(stock: Stock) {
    addRecent(stock.ticker)
    setRecent(getRecent())
    router.push(`/asset/${stock.ticker}`)
  }

  function handleArticleTap(id: string) {
    router.push(`/article/${id}`)
  }

  const isEmpty = !query.trim()
  const hasResults = results && (results.stocks.length > 0 || results.articles.length > 0)

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>

      {/* ── Search bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 px-4 py-3"
        style={{ background: 'rgba(8,12,24,0.98)', borderBottom: '1px solid rgba(232,184,75,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 pointer-events-none"
            style={{ color: loading ? 'var(--gold)' : 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search stocks, companies, news…"
            className="w-full pl-9 pr-10 py-3 rounded-2xl text-[14px] outline-none transition-all"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid rgba(232,184,75,0.14)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="absolute right-3 flex items-center justify-center"
              style={{ width: 22, height: 22, borderRadius: 11, background: 'var(--bg-4)', color: 'var(--text-muted)' }}>
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-8">

        {/* ── Empty state: Recent + Discover categories ──────────────── */}
        {isEmpty && (
          <>
            {/* Recent searches */}
            {recent.length > 0 && (
              <div className="mt-5 mb-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] font-mono"
                    style={{ color: 'var(--text-muted)' }}>Recent</span>
                  <button onClick={() => { clearRecent(); setRecent([]) }}
                    className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Clear</button>
                </div>
                <div className="flex flex-col gap-1">
                  {recent.map(r => (
                    <button key={r} onClick={() => handleSelect(r)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                      <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{r}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Discover categories */}
            {results?.trending?.map(cat => (
              <div key={cat.id} className="mt-6">
                {/* Category header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>{cat.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] font-mono"
                      style={{ color: 'var(--text-muted)' }}>{cat.label}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(232,184,75,0.08)', color: 'rgba(232,184,75,0.50)', border: '1px solid rgba(232,184,75,0.12)' }}>
                      SIMULATED
                    </span>
                  </div>
                </div>

                {/* Stock rows */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                  {cat.stocks.map((s, i) => {
                    const isUp = s.change >= 0
                    return (
                      <button key={s.ticker}
                        onClick={() => handleStockTap(s)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        style={{
                          background: 'var(--bg-2)',
                          borderBottom: i < cat.stocks.length - 1 ? '1px solid var(--line)' : 'none',
                        }}>

                        {/* Rank */}
                        <span className="font-mono text-[10px] w-4 flex-shrink-0 text-right"
                          style={{ color: 'var(--text-faint)' }}>{i + 1}</span>

                        {/* Icon */}
                        <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                          style={{ width: 36, height: 36, background: `${s.sectorColor}14`, border: `1px solid ${s.sectorColor}28` }}>
                          <span className="font-mono font-bold text-[9px]" style={{ color: s.sectorColor }}>
                            {s.ticker.slice(0, 4)}
                          </span>
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>{s.ticker}</span>
                            {s.note && (
                              <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(232,184,75,0.08)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.15)' }}>
                                {s.note}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{s.name}</div>
                        </div>

                        {/* Price + change */}
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-bold text-[13px]" style={{ color: 'var(--text-primary)' }}>
                            ${s.price.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="font-mono font-bold text-[11px]"
                            style={{ color: isUp ? 'var(--green)' : 'var(--red)' }}>
                            {isUp ? '▲' : '▼'} {Math.abs(s.change).toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Search results ──────────────────────────────────────────── */}
        {!isEmpty && (
          <>
            {/* No results */}
            {!loading && results && !hasResults && (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <Search size={22} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[15px] mb-1">No results for "{query}"</p>
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Try a ticker symbol, company name, or topic
                  </p>
                </div>
              </div>
            )}

            {/* Stocks */}
            {results && results.stocks.length > 0 && (
              <div className="mt-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-[3px] h-[14px] rounded-full flex-shrink-0"
                    style={{ background: 'var(--gold)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] font-mono"
                    style={{ color: 'var(--text-muted)' }}>
                    Stocks & Companies
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                  {results.stocks.map((s, i) => (
                    <button key={s.ticker} onClick={() => handleStockTap(s)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                      style={{
                        background: 'var(--bg-2)',
                        borderBottom: i < results.stocks.length - 1 ? '1px solid var(--line)' : 'none',
                      }}>
                      {/* Icon */}
                      <div className="flex items-center justify-center rounded-xl flex-shrink-0"
                        style={{ width: 40, height: 40, background: `${s.sectorColor}18`, border: `1px solid ${s.sectorColor}30` }}>
                        <span className="font-mono font-bold text-[11px]" style={{ color: s.sectorColor }}>
                          {s.ticker.slice(0, 3)}
                        </span>
                      </div>

                      {/* Name / sector */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[14px]" style={{ color: 'var(--text-primary)' }}>{s.ticker}</div>
                        <div className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{s.name}</div>
                      </div>

                      {/* Sector pill */}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: `${s.sectorColor}18`, color: s.sectorColor, border: `1px solid ${s.sectorColor}28` }}>
                        {s.sector}
                      </span>

                      <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Articles */}
            {results && results.articles.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-[3px] h-[14px] rounded-full flex-shrink-0"
                    style={{ background: 'var(--gold)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] font-mono"
                    style={{ color: 'var(--text-muted)' }}>
                    News Articles
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {results.articles.map(a => (
                    <button key={a.id} onClick={() => handleArticleTap(a.id)}
                      className="w-full text-left px-4 py-4 rounded-2xl"
                      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>

                      {/* Source + time */}
                      <div className="flex items-center gap-2 mb-2">
                        {a.sector && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(232,184,75,0.10)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.20)' }}>
                            {a.sector}
                          </span>
                        )}
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {a.source.name}
                        </span>
                        <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>·</span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(a.publishedAt)}
                        </span>
                      </div>

                      {/* Title */}
                      <p className="font-semibold text-[13px] leading-snug mb-2"
                        style={{ color: 'var(--text-primary)' }}>
                        {a.title}
                      </p>

                      {/* Summary */}
                      {a.summary && (
                        <p className="text-[12px] leading-relaxed line-clamp-2"
                          style={{ color: 'var(--text-muted)' }}>
                          {a.summary}
                        </p>
                      )}

                      {/* Tickers */}
                      {a.relatedTickers.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {a.relatedTickers.slice(0, 4).map(t => (
                            <span key={t} className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(232,184,75,0.08)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.18)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
