'use client'

import { useState } from 'react'
import { Bookmark, Trash2, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'

interface SavedItem {
  id: string
  ticker: string
  headline: string
  source: string
  publishedAt: string
  change: number | null
  price: number | null
  category: string
  sectorColor: string
  sourceUrl: string
}

const SAVED_ITEMS: SavedItem[] = [
  {
    id: '2',
    ticker: 'RBA',
    headline: 'RBA Holds Cash Rate at 4.10% — Board Signals Possible Cut in November',
    source: 'Reserve Bank of Australia',
    publishedAt: '45m ago',
    change: null,
    price: null,
    category: 'Central Bank',
    sectorColor: '#d4a843',
    sourceUrl: 'https://www.rba.gov.au',
  },
  {
    id: '5',
    ticker: 'ASX',
    headline: 'ASX CHESS Replacement Approved: $250M DTCC-Backed System Goes Live Q3 2025',
    source: 'The Australian',
    publishedAt: '5h ago',
    change: 0.65,
    price: 63.40,
    category: 'Infrastructure',
    sectorColor: '#a78bfa',
    sourceUrl: 'https://www.theaustralian.com.au',
  },
]

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>(SAVED_ITEMS)

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-[18px] font-medium">Saved Briefings</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {items.length} item{items.length !== 1 ? 's' : ''} saved
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--gold-a)', border: '1px solid var(--gold-b)' }}
          >
            <Bookmark size={16} strokeWidth={2} style={{ color: 'var(--gold)' }} />
          </div>
        </div>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
            >
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
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl p-4"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
              >
                {/* Top row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: item.sectorColor, background: `${item.sectorColor}1a` }}
                    >
                      {item.ticker}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {item.category} · {item.publishedAt}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-3)' }}
                  >
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </div>

                <p className="font-serif text-[14px] leading-snug mb-3">
                  {item.headline}
                </p>

                {/* Price row */}
                {item.price != null && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-[14px] font-semibold">${item.price.toFixed(2)}</span>
                    {item.change != null && (
                      <span
                        className="flex items-center gap-1 font-mono text-[11px]"
                        style={{ color: item.change >= 0 ? 'var(--green)' : 'var(--red)' }}
                      >
                        {item.change >= 0 ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid var(--line)' }}>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {item.source}
                  </span>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold"
                    style={{ color: 'var(--blue)' }}
                  >
                    View <ExternalLink size={10} strokeWidth={2.5} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
