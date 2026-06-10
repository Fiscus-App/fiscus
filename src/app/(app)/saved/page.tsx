'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Trash2, ExternalLink, Loader2 } from 'lucide-react'

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
  Banking: '#5b8af5', Mining: '#2ed494', Energy: '#f97316',
  Technology: '#a78bfa', Healthcare: '#06b6d4', Property: '#ec4899',
  Retail: '#f59e0b', Insurance: '#84cc16', 'Monetary Policy': '#d4a843',
  Macroeconomics: '#d4a843', Commodities: '#d4a843', Exchange: '#a78bfa',
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
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-[18px] font-medium">Saved Briefings</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Loading…' : `${items.length} item${items.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--gold-a)', border: '1px solid var(--gold-b)' }}>
            <Bookmark size={16} strokeWidth={2} style={{ color: 'var(--gold)' }} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
              <Bookmark size={28} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-[14px]">No saved briefings</p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Tap the bookmark icon on any card to save it here
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const color = SECTOR_COLORS[item.sector ?? ''] ?? '#5b8af5'
              return (
                <div key={item.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color, background: `${color}1a` }}>
                        {item.ticker}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {item.sector ?? 'News'} · {timeAgo(item.savedAt)}
                      </span>
                    </div>
                    <button onClick={() => handleRemove(item.id, item.articleId)}
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ color: 'var(--text-muted)', background: 'var(--bg-3)' }}>
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>

                  <p className="font-serif text-[14px] leading-snug mb-2">{item.title}</p>

                  {item.summary && (
                    <p className="text-[12px] leading-relaxed mb-3 line-clamp-2"
                      style={{ color: 'var(--text-muted)' }}>
                      {item.summary}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2.5"
                    style={{ borderTop: '1px solid var(--line)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {item.source}
                    </span>
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-semibold"
                      style={{ color: 'var(--blue)' }}>
                      Read <ExternalLink size={10} strokeWidth={2.5} />
                    </a>
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
