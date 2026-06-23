'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import {
  TrendingUp, Bookmark, Share2, Play,
  Loader2, Music2, ChevronUp, ChevronDown, X,
} from 'lucide-react'
import { SourceBadge } from './SourceBadge'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import type { FeedItem, VideoComposition } from '@/types'

interface Props {
  item: FeedItem
  height: number
  /** True when this is the in-view card — triggers muted scroll-autoplay. */
  active?: boolean
  onInsightful: (id: string) => void
  onSave: (id: string) => void
  onShare: (id: string) => void
}

export function VideoCard({ item, height, active = false, onInsightful, onSave, onShare }: Props) {
  const [expanded, setExpanded]   = useState(false)
  const [aiScript, setAiScript]   = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone]       = useState(false)
  const [playerOpen, setPlayerOpen]     = useState(false)
  const [composing, setComposing]       = useState(false)
  const [composition, setComposition]   = useState<VideoComposition | null>(null)
  const [progress, setProgress]         = useState(0)

  const isUp       = item.change != null && item.change >= 0
  const chartColor = item.change != null ? (isUp ? '#2ed494' : '#ff5252') : '#5b8af5'
  const chartData  = item.chartData?.map((v) => ({ v })) ?? []
  const displayScript = aiDone && aiScript ? aiScript : item.script

  // ── Open the AI video: compose on demand, then play ─────────────────────────
  const openPlayer = useCallback(async () => {
    if (composition) { setPlayerOpen(true); return }
    if (composing) return
    setComposing(true)
    try {
      const res = await fetch('/api/videos/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: item.id,
          ticker: item.ticker, company: item.company, headline: item.headline,
          summary: item.teaser, sector: item.sector, sectorColor: item.sectorColor,
          category: item.category, source: item.source,
          change: item.change, price: item.price, series: item.chartData,
        }),
      })
      if (!res.ok) throw new Error('compose failed')
      const json = await res.json()
      setComposition(json.composition as VideoComposition)
      setProgress(0)
      setPlayerOpen(true)
    } catch {
      /* leave the card as-is on failure */
    } finally {
      setComposing(false)
    }
  }, [composition, composing, item])

  // ── Scroll-autoplay: the in-view card starts instantly (voiced), and stops
  //    when it scrolls away. No click, no unmute, no settle delay.
  const openPlayerRef = useRef(openPlayer)
  openPlayerRef.current = openPlayer
  useEffect(() => {
    if (!active) { setPlayerOpen(false); return }
    openPlayerRef.current()
  }, [active])

  // ── AI script stream ──────────────────────────────────────────────────────
  const handleAI = useCallback(async () => {
    if (aiLoading || aiDone) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/articles/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: item.ticker, company: item.company, headline: item.headline,
          teaser: item.teaser, sector: item.sector, category: item.category,
          change: item.change, price: item.price, source: item.source,
        }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let text = ''
      setAiScript('')
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setAiScript(text)
      }
      setAiDone(true)
    } catch {
      setAiScript(item.script); setAiDone(true)
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiDone, item])

  const toggleExpand = () => {
    const next = !expanded
    setExpanded(next)
    if (next && !aiDone) handleAI()
  }

  return (
    <div className="relative overflow-hidden select-none" style={{ height, background: '#05081a' }}>

      {/* ══ FULL-SCREEN BACKGROUND ════════════════════════════════════════ */}
      <div className="absolute inset-0">
        {/* Grid lines */}
        <div className="absolute inset-0 chart-grid" style={{ opacity: 0.35 }} />

        {/* Scan line */}
        <div className="scan-line absolute left-0 right-0 pointer-events-none"
          style={{ height: 1, background: 'rgba(255,255,255,0.03)' }} />

        {/* Full-bleed chart */}
        {chartData.length > 0 && (
          <div className="absolute inset-0" style={{ opacity: 0.28 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`bg-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={chartColor}
                  strokeWidth={1.5} fill={`url(#bg-${item.id})`} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Sector color accent glow — richer, more cinematic */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 90% 70% at 50% 35%, ${item.sectorColor}15 0%, transparent 65%)`,
        }} />
        {/* Bottom ambient warmth */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
          height: '40%',
          background: `radial-gradient(ellipse 100% 80% at 50% 100%, ${item.sectorColor}08 0%, transparent 70%)`,
        }} />

        {/* Centre financial display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ paddingBottom: '32%' }}>
          <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase mb-3 px-3 py-1 rounded-md"
            style={{ color: item.sectorColor, background: `${item.sectorColor}1a`, border: `1px solid ${item.sectorColor}30` }}>
            {item.ticker} · {item.sector}
          </span>

          {item.price != null ? (
            <>
              <span className="font-mono font-bold" style={{
                fontSize: 54, letterSpacing: '-0.03em',
                color: 'rgba(238,242,255,0.88)',
                textShadow: '0 2px 40px rgba(0,0,0,0.9)',
              }}>
                ${item.price.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {item.change != null && (
                <span className="font-mono font-bold mt-1" style={{
                  fontSize: 20, color: isUp ? '#2ed494' : '#ff5252',
                  textShadow: `0 0 20px ${isUp ? 'rgba(46,212,148,0.5)' : 'rgba(255,82,82,0.5)'}`,
                }}>
                  {isUp ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                </span>
              )}
            </>
          ) : (
            <span className="font-serif font-medium text-center px-10 opacity-50" style={{ fontSize: 20, color: '#eef2ff', lineHeight: 1.5 }}>
              {item.company}
            </span>
          )}
        </div>

        {/* Top gradient — subtle fade for tabs */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
          height: 80,
          background: 'linear-gradient(180deg, rgba(5,8,26,0.70) 0%, transparent 100%)',
        }} />
        {/* Bottom gradient — text readability */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
          height: '65%',
          background: 'linear-gradient(0deg, rgba(5,8,26,1) 0%, rgba(5,8,26,0.95) 30%, rgba(5,8,26,0.7) 55%, transparent 100%)',
        }} />
      </div>

      {/* ══ SOURCE BADGE — top left ═══════════════════════════════════════ */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <SourceBadge source={item.source} credibility={item.sourceType} />
        <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest"
          style={{ color: 'rgba(255,255,255,0.45)' }}>
          <span className="live-dot inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: '#2ed494' }} />
          LIVE
        </div>
      </div>

      {/* ══ CENTRE PLAY BUTTON ════════════════════════════════════════════ */}
      {!playerOpen && (
        <button onClick={() => openPlayer()} disabled={composing} aria-label="Play AI video"
          className="absolute flex items-center justify-center rounded-full z-10"
          style={{
            top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 68, height: 68,
            background: 'rgba(212,168,67,0.18)',
            border: '2px solid rgba(212,168,67,0.55)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 30px rgba(212,168,67,0.2)',
            cursor: composing ? 'wait' : 'pointer',
          }}>
          {composing
            ? <Loader2 size={26} className="animate-spin" style={{ color: 'var(--gold)' }} />
            : <Play size={26} fill="var(--gold)" style={{ color: 'var(--gold)', marginLeft: 4 }} />}
        </button>
      )}

      {/* ══ RIGHT SIDEBAR ═════════════════════════════════════════════════ */}
      <div className="absolute right-3 flex flex-col items-center gap-5 z-10"
        style={{ bottom: expanded ? 280 : 108 , transition: 'bottom 0.3s ease' }}>

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[13px]"
            style={{
              background: 'rgba(232,184,75,0.12)',
              border: '2px solid rgba(232,184,75,0.45)',
              color: 'var(--gold)',
              boxShadow: '0 0 14px rgba(232,184,75,0.18)',
            }}>
            {item.ticker.slice(0, 2)}
          </div>
          <div className="w-5 h-5 rounded-full flex items-center justify-center -mt-2.5"
            style={{ background: 'var(--gold)', border: '2px solid #05081a' }}>
            <span style={{ fontSize: 11, color: '#05081a', fontWeight: 900, lineHeight: 1 }}>+</span>
          </div>
        </div>

        {/* Insight / TrendingUp */}
        <button onClick={() => onInsightful(item.id)}
          className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer p-0">
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: item.isInsightful
              ? 'linear-gradient(135deg, rgba(232,184,75,0.28), rgba(232,184,75,0.14))'
              : 'rgba(255,255,255,0.08)',
            border: item.isInsightful
              ? '1px solid rgba(232,184,75,0.55)'
              : '1px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: item.isInsightful ? '0 0 16px rgba(232,184,75,0.30)' : 'none',
            transition: 'all 0.2s ease',
          }}>
            <TrendingUp size={20} strokeWidth={2.2}
              style={{
                color: item.isInsightful ? 'var(--gold)' : 'white',
                filter: item.isInsightful ? 'drop-shadow(0 0 6px rgba(232,184,75,0.7))' : 'none',
              }} />
          </div>
          <span className="font-bold text-[11px] mt-0.5" style={{ color: item.isInsightful ? 'var(--gold)' : 'rgba(255,255,255,0.7)' }}>
            {item.insightfulCount > 999
              ? `${(item.insightfulCount / 1000).toFixed(1)}k`
              : item.insightfulCount}
          </span>
        </button>

        {/* Save / Bookmark */}
        <button onClick={() => onSave(item.id)}
          className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer p-0">
          <Bookmark size={30} strokeWidth={1.5}
            fill={item.isSaved ? 'white' : 'none'} style={{ color: 'white' }} />
          <span className="font-bold text-[12px]" style={{ color: 'white' }}>
            {item.isSaved ? 'Saved' : 'Save'}
          </span>
        </button>

        {/* Share */}
        <button onClick={() => onShare(item.id)}
          className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer p-0">
          <Share2 size={28} strokeWidth={1.5} style={{ color: 'white' }} />
          <span className="font-bold text-[12px]" style={{ color: 'white' }}>
            {item.shareCount && item.shareCount > 0
              ? (item.shareCount > 999 ? `${(item.shareCount / 1000).toFixed(1)}k` : item.shareCount)
              : 'Share'}
          </span>
        </button>

        {/* Spinning record */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1e2a44 0%, #07091a 100%)',
            border: '2px solid rgba(255,255,255,0.25)',
            animation: playerOpen ? 'spin 3s linear infinite' : 'none',
          }}>
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#07091a', border: '2px solid rgba(255,255,255,0.3)' }} />
        </div>
      </div>

      {/* ══ BOTTOM CONTENT OVERLAY ════════════════════════════════════════ */}
      <div className="absolute bottom-0 left-0 z-10" style={{ right: 72, padding: '0 16px 12px' }}>

        {/* @handle · time */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="font-sans font-bold text-[13px]" style={{ color: 'white' }}>
            @fiscus
          </span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>·</span>
          <span className="font-mono text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {item.publishedAt}
          </span>
        </div>

        {/* Headline */}
        <p className="font-sans font-bold leading-snug mb-2"
          style={{ fontSize: 14, color: 'rgba(238,242,255,0.97)', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
          {item.headline}
        </p>

        {/* AI description — expandable */}
        <div className="mb-2">
          <p className={`text-[13px] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
            style={{ color: 'rgba(238,242,255,0.72)' }}>
            {displayScript}
            {aiLoading && <span className="cursor ml-0.5">|</span>}
          </p>

          <button onClick={toggleExpand}
            className="flex items-center gap-0.5 mt-0.5 bg-transparent border-none cursor-pointer p-0"
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}>
            {aiLoading
              ? <><Loader2 size={11} className="animate-spin" style={{ marginRight: 4 }} />Generating briefing...</>
              : expanded
                ? <><ChevronUp size={13} /> See less</>
                : <>... <ChevronDown size={13} /> See more</>
            }
          </button>
        </div>

        {/* Hashtags */}
        <div className="flex items-center gap-2 overflow-x-auto mb-3" style={{ scrollbarWidth: 'none' }}>
          {item.tags.map((tag) => (
            <span key={tag} className="font-sans font-semibold text-[12px] whitespace-nowrap"
              style={{ color: 'rgba(238,242,255,0.8)' }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Scrolling audio bar */}
        <div className="flex items-center gap-2 overflow-hidden">
          <Music2 size={12} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
          <div className="overflow-hidden flex-1">
            <div className="font-mono text-[10px] whitespace-nowrap"
              style={{ color: 'rgba(255,255,255,0.4)', animation: 'ticker-scroll 14s linear infinite' }}>
              Fiscus AI Briefing&nbsp;·&nbsp;{item.source}&nbsp;·&nbsp;{item.category}&nbsp;·&nbsp;{item.publishedAt}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              Fiscus AI Briefing&nbsp;·&nbsp;{item.source}&nbsp;·&nbsp;{item.category}&nbsp;·&nbsp;{item.publishedAt}
            </div>
          </div>
        </div>
      </div>

      {/* ══ PROGRESS BAR ══════════════════════════════════════════════════ */}
      <div className="absolute bottom-0 left-0 right-0 z-20" style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, var(--gold), rgba(212,168,67,0.5))',
          transition: playerOpen ? 'width 0.1s linear' : 'none',
        }} />
      </div>

      {/* ══ AI VIDEO PLAYER OVERLAY ═══════════════════════════════════════ */}
      {playerOpen && composition && (
        <div className="absolute inset-0 z-40">
          <VideoPlayer
            composition={composition}
            onProgress={(f) => setProgress(f * 100)}
          />
          <button onClick={() => setPlayerOpen(false)} aria-label="Close video"
            className="absolute top-3 right-3 z-50 flex items-center justify-center rounded-full"
            style={{
              width: 34, height: 34, background: 'rgba(5,8,26,0.7)',
              border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
            }}>
            <X size={18} style={{ color: 'rgba(255,255,255,0.85)' }} />
          </button>
        </div>
      )}

    </div>
  )
}
