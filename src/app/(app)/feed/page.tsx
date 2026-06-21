'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VideoCard } from '@/components/feed/VideoCard'
import { useFeedInteractions } from '@/lib/useFeedInteractions'
import { RefreshCw, TrendingUp } from 'lucide-react'
import type { FeedItem } from '@/types'

const TABS = ['Market News', 'Following']
const TAB_H = 48 // dedicated height for the feed tab bar, so cards sit below it

export default function FeedPage() {
  const router = useRouter()
  const [tab, setTab]               = useState(0)
  const [items, setItems]           = useState<FeedItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [cardHeight, setCardHeight] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  // Viewport height minus header (58), nav (70) and the feed tab bar.
  useEffect(() => {
    const update = () => setCardHeight(window.innerHeight - 58 - 70 - TAB_H)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/feed?pageSize=30')
      if (!res.ok) return
      const json = await res.json()
      if (json.source === 'error') return
      const data: FeedItem[] = Array.isArray(json.data) ? json.data : []
      // First/manual load reflects the result exactly (including empty); silent
      // background polls only replace when there's data, to avoid clearing the
      // feed on a transient empty response.
      if (!silent || data.length > 0) setItems(data)
    } catch {
      /* keep whatever's already on screen */
    } finally {
      setLoading(false)
      if (!silent) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(true)
    intervalRef.current = setInterval(() => fetchFeed(true), 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchFeed])

  const { handleInsightful, handleSave, handleShare } = useFeedInteractions(items, setItems)

  if (cardHeight === 0) return null

  return (
    <div className="relative h-full flex flex-col" style={{ background: '#07091a' }}>

      {/* ── Feed tab bar (own row — sits above the cards, never over them) ─ */}
      <div
        className="flex-shrink-0 relative flex items-center justify-center gap-1 z-20"
        style={{ height: TAB_H, background: '#07091a', borderBottom: '1px solid var(--line)' }}
      >
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (label === 'Following') { router.push('/following'); return }
              setTab(i)
            }}
            className="relative font-sans font-semibold text-[13px] px-3.5 py-1.5 rounded-full bg-transparent cursor-pointer transition-all"
            style={{
              color: tab === i ? '#fff' : 'rgba(255,255,255,0.42)',
              background: tab === i ? 'rgba(232,184,75,0.14)' : 'transparent',
              border: tab === i ? '1px solid rgba(232,184,75,0.28)' : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
        {refreshing && (
          <RefreshCw size={12} className="animate-spin absolute right-4"
            style={{ color: 'rgba(255,255,255,0.35)' }} />
        )}
      </div>

      {/* ── Snap-scroll feed (starts cleanly below the tab bar) ───────────── */}
      <div className="feed-scroll" style={{ height: cardHeight }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3" style={{ height: cardHeight }}>
            <RefreshCw size={22} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>Loading briefings…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 text-center" style={{ height: cardHeight }}>
            <div className="flex items-center justify-center mb-4"
              style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(232,184,75,0.10)', border: '1px solid rgba(232,184,75,0.22)' }}>
              <TrendingUp size={30} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
            </div>
            <h2 className="font-serif font-semibold mb-2" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
              No briefings yet
            </h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 260 }}>
              Fresh market briefings appear here as they&apos;re published. Check back shortly.
            </p>
            <button onClick={() => fetchFeed(false)}
              className="mt-5 px-4 py-2 rounded-xl text-[12px] font-semibold inline-flex items-center gap-1.5"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-secondary)' }}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="feed-item" style={{ height: cardHeight }}>
              <VideoCard
                item={item}
                height={cardHeight}
                onInsightful={handleInsightful}
                onSave={handleSave}
                onShare={handleShare}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
