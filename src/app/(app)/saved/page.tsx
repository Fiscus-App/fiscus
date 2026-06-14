'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Trash2, ExternalLink, Loader2, TrendingUp } from 'lucide-react'

interface SavedItem {
  id: string
  articleId: string
  ticker: string
  title: string
  source: string
  sector: string | null
  summary: string | null
  url: string
  savedAt: string
}

const SECTOR_COLORS: Record<string, string> = {
  Banking:          '#5b8af5',
  Mining:           '#22d48a',
  Energy:           '#f97316',
  Technology:       '#a78bfa',
  Healthcare:       '#06b6d4',
  Property:         '#ec4899',
  Retail:           '#f59e0b',
  Insurance:        '#84cc16',
  'Monetary Policy':'#e8b84b',
  Macroeconomics:   '#e8b84b',
  Commodities:      '#e8b84b',
  Exchange:         '#a78bfa',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function SavedPage() {
  const [items, setItems]     = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/profile/saves')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleRemove(id: string, articleId: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await fetch('/api/interactions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId }),
    })
  }

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 pt-5 pb-6">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] font-mono tracking-[0.18em] uppercase mb-1"
              style={{ color: 'var(--text-muted)' }}>
              Your Library
            </p>
            <h1 className="font-serif font-bold text-[24px]" style={{ letterSpacing: '-0.02em' }}>
              Saved Briefings
            </h1>
            {!loading && (
              <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                {items.length} {items.length !== 1 ? 'briefings' : 'briefing'} saved
              </p>
            )}
          </div>

          <div
            className="flex items-center justify-center"
            style={{
              width: 42, height: 42, borderRadius: 13,
              background: 'rgba(232,184,75,0.10)',
              border: '1px solid rgba(232,184,75,0.28)',
              boxShadow: '0 0 20px rgba(232,184,75,0.08)',
            }}
          >
            <Bookmark size={18} strokeWidth={2} style={{ color: 'var(--gold)' }} />
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>
              Loading your library…
            </span>
          </div>

        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div
              className="flex items-center justify-center"
              style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'var(--bg-3)', border: '1px solid var(--line)',
              }}
            >
              <Bookmark size={26} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-[14px]" style={{ letterSpacing: '-0.01em' }}>
                Nothing saved yet
              </p>
              <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Tap the bookmark on any briefing<br />to save it here for later
              </p>
            </div>
          </div>

        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const color = SECTOR_COLORS[item.sector ?? ''] ?? '#5b8af5'
              return (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
                >
                  {/* Colour accent top strip */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />

                  <div className="p-4">
                    {/* Meta row */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {/* Ticker pill */}
                        <span
                          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
                        >
                          {item.ticker}
                        </span>

                        {item.sector && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            {item.sector}
                          </span>
                        )}

                        <span
                          className="text-[9px] font-mono"
                          style={{ color: 'var(--text-faint)' }}
                        >
                          · {timeAgo(item.savedAt)}
                        </span>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(item.id, item.articleId)}
                        className="flex items-center justify-center"
                        style={{
                          width: 28, height: 28, borderRadius: 8,
                          color: 'var(--text-muted)',
                          background: 'var(--bg-3)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <Trash2 size={11} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Headline */}
                    <p
                      className="font-serif font-medium leading-snug mb-2.5"
                      style={{ fontSize: 15, letterSpacing: '-0.01em' }}
                    >
                      {item.title}
                    </p>

                    {/* Summary */}
                    {item.summary && (
                      <p
                        className="text-[12px] leading-relaxed line-clamp-2 mb-3"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {item.summary}
                      </p>
                    )}

                    {/* Footer */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: '1px solid var(--line)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={10} strokeWidth={2} style={{ color: 'var(--text-faint)' }} />
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {item.source}
                        </span>
                      </div>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] font-bold no-underline px-2.5 py-1 rounded-lg"
                        style={{
                          color: 'var(--gold)',
                          background: 'rgba(232,184,75,0.08)',
                          border: '1px solid rgba(232,184,75,0.20)',
                        }}
                      >
                        Read full story
                        <ExternalLink size={9} strokeWidth={2.5} />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
