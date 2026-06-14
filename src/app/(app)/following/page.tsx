'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VideoCard } from '@/components/feed/VideoCard'
import { getLocalFollows, type Follow } from '@/lib/following'
import { UserCircle, TrendingUp, RefreshCw } from 'lucide-react'
import type { FeedItem } from '@/types'

export default function FollowingPage() {
  const router = useRouter()
  const [follows, setFollows]       = useState<Follow[]>([])
  const [items, setItems]           = useState<FeedItem[]>([])
  const [cardHeight, setCardHeight] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  // Card height = viewport - header (58) - nav (70)
  useEffect(() => {
    const update = () => setCardHeight(window.innerHeight - 58 - 70)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Load follows from localStorage
  useEffect(() => {
    setFollows(getLocalFollows())
  }, [])

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    setLoading(true)
    try {
      const res = await fetch('/api/feed/following')
      if (res.ok) {
        const json = await res.json()
        if (json.data?.length > 0) setItems(json.data)
      }
    } catch { /* stay empty */ } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(true)
    intervalRef.current = setInterval(() => fetchFeed(true), 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchFeed])

  const handleInsightful = useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, isInsightful: !item.isInsightful,
            insightfulCount: item.insightfulCount + (item.isInsightful ? -1 : 1) }
        : item
    ))
    fetch('/api/interactions/insightful', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    }).catch(() => {
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, isInsightful: !item.isInsightful,
              insightfulCount: item.insightfulCount + (item.isInsightful ? -1 : 1) }
          : item
      ))
    })
  }, [])

  const handleSave = useCallback((id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, isSaved: !item.isSaved } : item))
    fetch('/api/interactions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    }).catch(() => {
      setItems(prev => prev.map(item => item.id === id ? { ...item, isSaved: !item.isSaved } : item))
    })
  }, [])

  const handleShare = useCallback((id: string) => {
    const item = items.find(i => i.id === id)
    if (item && navigator.share) navigator.share({ title: item.headline, text: item.teaser }).catch(() => {})
  }, [items])

  if (cardHeight === 0) return null

  // ── Empty state — no follows yet ─────────────────────────────────────────
  if (!loading && follows.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#07091a' }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center mb-5"
          style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'linear-gradient(135deg, rgba(232,184,75,0.12) 0%, rgba(232,184,75,0.04) 100%)',
            border: '1px solid rgba(232,184,75,0.22)',
            boxShadow: '0 0 48px rgba(232,184,75,0.08)',
          }}
        >
          <TrendingUp size={36} strokeWidth={1.5} style={{ color: 'var(--gold)' }} />
        </div>

        <h2
          className="font-serif font-semibold mb-2"
          style={{ fontSize: 22, letterSpacing: '-0.02em' }}
        >
          Nothing in your feed yet
        </h2>
        <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'var(--text-muted)', maxWidth: 280 }}>
          Follow stocks, sectors, and news sources to build your personalised financial feed.
        </p>

        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-[14px]"
          style={{
            background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
            color: '#05081a',
            boxShadow: '0 0 24px rgba(232,184,75,0.25)',
          }}
        >
          <UserCircle size={16} strokeWidth={2} />
          Set up your Following
        </button>

        <p className="text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Profile → Following tab
        </p>
      </div>
    )
  }

  // ── Empty state — has follows but no matching articles ────────────────────
  if (!loading && follows.length > 0 && items.length === 0) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-6 text-center"
        style={{ background: '#07091a' }}
      >
        <div
          className="flex items-center justify-center mb-5"
          style={{
            width: 80, height: 80, borderRadius: 24,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--line)',
          }}
        >
          <RefreshCw size={32} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </div>

        <h2
          className="font-serif font-semibold mb-2"
          style={{ fontSize: 20, letterSpacing: '-0.02em' }}
        >
          No articles yet
        </h2>
        <p className="text-[12px]" style={{ color: 'var(--text-muted)', maxWidth: 260 }}>
          We&apos;re monitoring your {follows.length} followed {follows.length === 1 ? 'item' : 'items'}.
          Check back soon for fresh coverage.
        </p>

        {/* Show current follows as chips */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-6" style={{ maxWidth: 320 }}>
          {follows.slice(0, 8).map(f => (
            <span
              key={`${f.type}-${f.value}`}
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid var(--line)',
                color: 'var(--text-secondary)',
              }}
            >
              {f.value}
            </span>
          ))}
          {follows.length > 8 && (
            <span
              className="px-2.5 py-1 rounded-full text-[10px]"
              style={{ color: 'var(--text-muted)' }}
            >
              +{follows.length - 8} more
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── Live feed ─────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full" style={{ background: '#07091a' }}>
      {/* Tab label */}
      <div
        className="absolute flex items-center justify-center gap-2 z-20"
        style={{ top: 10, left: 0, right: 0 }}
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
          style={{
            background: 'rgba(232,184,75,0.14)',
            border: '1px solid rgba(232,184,75,0.28)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
          }}
        >
          <TrendingUp size={11} strokeWidth={2.5} style={{ color: 'var(--gold)' }} />
          Following
        </div>
        {refreshing && (
          <RefreshCw size={11} className="animate-spin" style={{ color: 'rgba(255,255,255,0.35)' }} />
        )}
      </div>

      {/* Snap-scroll feed */}
      <div className="feed-scroll h-full">
        {items.map(item => (
          <div key={item.id} className="feed-item" style={{ height: cardHeight }}>
            <VideoCard
              item={item}
              height={cardHeight}
              onInsightful={handleInsightful}
              onSave={handleSave}
              onShare={handleShare}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
