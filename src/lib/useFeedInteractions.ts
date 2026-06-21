'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { FeedItem } from '@/types'

// Shared insightful / save / share handlers for any feed list. Updates the UI
// optimistically for instant feedback, then reconciles with the real aggregate
// counts the server returns (so everyone's votes/shares are reflected).
export function useFeedInteractions(
  items: FeedItem[],
  setItems: Dispatch<SetStateAction<FeedItem[]>>,
) {
  const handleInsightful = useCallback((id: string) => {
    let next = false
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      next = !i.isInsightful
      return { ...i, isInsightful: next, insightfulCount: Math.max(0, i.insightfulCount + (next ? 1 : -1)) }
    }))

    fetch('/api/interactions/insightful', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { insightful: boolean; count: number }) => {
        setItems((prev) => prev.map((i) =>
          i.id === id ? { ...i, isInsightful: d.insightful, insightfulCount: d.count } : i))
      })
      .catch(() => {
        // revert the optimistic change
        setItems((prev) => prev.map((i) =>
          i.id === id
            ? { ...i, isInsightful: !next, insightfulCount: Math.max(0, i.insightfulCount + (next ? -1 : 1)) }
            : i))
      })
  }, [setItems])

  const handleSave = useCallback((id: string) => {
    let next = false
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      next = !i.isSaved
      return { ...i, isSaved: next }
    }))

    fetch('/api/interactions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    }).catch(() => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isSaved: !next } : i)))
    })
  }, [setItems])

  const handleShare = useCallback((id: string) => {
    const item = items.find((i) => i.id === id)

    // optimistic +1
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, shareCount: (i.shareCount ?? 0) + 1 } : i)))

    fetch('/api/interactions/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { count: number }) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, shareCount: d.count } : i)))
      })
      .catch(() => {
        setItems((prev) => prev.map((i) =>
          i.id === id ? { ...i, shareCount: Math.max(0, (i.shareCount ?? 1) - 1) } : i))
      })

    // native share sheet
    if (item && typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: item.headline, text: item.teaser }).catch(() => {})
    }
  }, [items, setItems])

  return { handleInsightful, handleSave, handleShare }
}
