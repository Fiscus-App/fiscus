'use client'

import { useState, useCallback } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import {
  Lightbulb,
  Bookmark,
  Share2,
  Clapperboard,
  Play,
  Loader2,
  Sparkles,
  Newspaper,
  Clock,
  Info,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react'
import clsx from 'clsx'
import { SourceBadge } from './SourceBadge'
import type { FeedItem } from '@/types'

interface Props {
  item: FeedItem
  height: number
  onInsightful: (id: string) => void
  onSave: (id: string) => void
  onShare: (id: string) => void
}

export function VideoCard({ item, height, onInsightful, onSave, onShare }: Props) {
  const [aiScript, setAiScript] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const [videoGenerating, setVideoGenerating] = useState(false)
  const [videoReady, setVideoReady] = useState(item.videoStatus === 'COMPLETE')
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const chartColor =
    item.change != null ? (item.change >= 0 ? '#2ed494' : '#ff5252') : '#5b8af5'
  const chartData = item.chartData?.map((v) => ({ v })) ?? []

  const handleGenerateAI = useCallback(async () => {
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
      if (!res.ok || !res.body) throw new Error('Stream failed')
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
      setAiScript('Unable to generate live briefing. The preview above is sourced from verified financial reporting.')
      setAiDone(true)
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiDone, item])

  const handleGenVideo = useCallback(async () => {
    if (videoGenerating || videoReady) return
    setVideoGenerating(true)
    try {
      await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: item.id }),
      })
      await new Promise((r) => setTimeout(r, 7000))
      setVideoReady(true)
    } catch { /* silent */ } finally {
      setVideoGenerating(false)
    }
  }, [videoGenerating, videoReady, item.id])

  const handlePlay = useCallback(() => {
    if (playing) return
    setPlaying(true)
    setProgress(0)
    const duration = 15000
    const start = performance.now()
    const tick = (now: number) => {
      const pct = Math.min((now - start) / duration, 1)
      setProgress(pct * 100)
      if (pct < 1) requestAnimationFrame(tick)
      else setPlaying(false)
    }
    requestAnimationFrame(tick)
  }, [playing])

  return (
    <div className="flex flex-col overflow-hidden relative" style={{ height, background: 'var(--bg)' }}>

      {/* ── Visual header ──────────────────────────────────────── */}
      <div
        className="flex-shrink-0 relative overflow-hidden chart-grid"
        style={{ height: 184, background: 'var(--bg-3)', borderBottom: '1px solid var(--line)' }}
      >
        <div
          className="scan-line absolute left-0 right-0 pointer-events-none"
          style={{ height: 1, background: 'rgba(255,255,255,0.04)' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(7,9,26,0.3) 0%, transparent 45%, rgba(7,9,26,0.55) 100%)' }}
        />

        <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div>
              <SourceBadge source={item.source} credibility={item.sourceType} />
              <div className="mt-1.5 font-mono text-[9.5px] tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {item.publishedAt} · {item.category}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={videoReady ? handlePlay : handleGenVideo}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all border backdrop-blur-md"
                style={{
                  borderColor: playing ? 'rgba(212,168,67,0.45)' : 'rgba(255,255,255,0.14)',
                  background: playing ? 'rgba(212,168,67,0.18)' : 'rgba(7,9,26,0.65)',
                  color: playing ? 'var(--gold)' : 'var(--text-secondary)',
                  boxShadow: playing ? '0 0 12px rgba(212,168,67,0.22)' : 'none',
                }}
                title={videoReady ? 'Play briefing' : 'Generate video'}
              >
                {videoGenerating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : videoReady ? (
                  <Play size={15} fill="currentColor" />
                ) : (
                  <Clapperboard size={15} />
                )}
              </button>
              <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
                <span className="live-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
                LIVE
              </div>
            </div>
          </div>

          {/* Price + chart */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded"
                style={{ color: item.sectorColor, background: `${item.sectorColor}1a`, letterSpacing: '0.07em' }}
              >
                {item.ticker}
              </span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {item.sector}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 mb-2">
              {item.price != null && (
                <span className="font-mono font-semibold" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
                  ${item.price.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              {item.change != null && (
                <span className="font-mono text-[13px] font-semibold" style={{ color: item.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                </span>
              )}
            </div>
            {chartData.length > 0 && (
              <div style={{ height: 42 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`g-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={chartColor} strokeWidth={1.5} fill={`url(#g-${item.id})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px]"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--gold), rgba(212,168,67,0.55))',
            transition: playing ? 'width 0.1s linear' : 'none',
          }}
        />
        {(videoReady || playing) && (
          <div className="absolute bottom-2 right-3 font-mono text-[9px] tracking-wide flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Play size={8} fill="currentColor" />
            {playing ? 'Playing 15s briefing...' : 'Ready to play'}
          </div>
        )}
      </div>

      {/* ── Scrollable body ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3.5 scroll-y" style={{ paddingRight: 68 }}>
        <h2 className="font-serif leading-snug mb-3" style={{ fontSize: 16, fontWeight: 500 }}>
          {item.headline}
        </h2>

        {/* AI Briefing */}
        <div className="rounded-xl p-3.5 mb-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2 mb-2.5" style={{ color: aiDone ? 'var(--gold)' : 'var(--text-muted)' }}>
            {aiDone ? <CheckCircle2 size={13} strokeWidth={2.5} /> : <Sparkles size={13} strokeWidth={2} />}
            <span className="text-[9.5px] font-bold uppercase tracking-widest">
              {aiDone ? 'AI Briefing · Live Generated' : 'Preview Briefing'}
            </span>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {aiDone && aiScript ? aiScript : item.script}
            {aiLoading && <span className="cursor ml-0.5">|</span>}
          </p>
          {!aiDone && (
            <button
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="mt-3 px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide flex items-center gap-1.5 transition-all disabled:opacity-40"
              style={{ background: 'var(--gold-a)', color: 'var(--gold)', border: '1px solid var(--gold-b)' }}
            >
              {aiLoading
                ? <><Loader2 size={11} className="animate-spin" /> Generating...</>
                : <><Sparkles size={11} /> Regenerate with Live AI</>
              }
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {item.tags.map((tag) => (
            <span key={tag} className="text-[10.5px] px-2 py-0.5 rounded-md font-medium"
              style={{ background: 'var(--bg-3)', color: 'var(--text-muted)', border: '1px solid var(--line)' }}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Source footer */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <Newspaper size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span>Source: </span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.source}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
                Published {item.publishedAt}
              </div>
              <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                <Info size={10} strokeWidth={2} style={{ flexShrink: 0 }} />
                Summaries are informational only — not financial advice
              </div>
            </div>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold flex-shrink-0"
              style={{ color: 'var(--blue)' }}>
              View source <ExternalLink size={10} strokeWidth={2.5} />
            </a>
          </div>
        </div>
        <div style={{ height: 10 }} />
      </div>

      {/* ── Sidebar actions ────────────────────────────────────── */}
      <div className="absolute right-3 flex flex-col items-center gap-4" style={{ bottom: 50 }}>
        <SidebarAction
          label={item.insightfulCount > 999 ? `${(item.insightfulCount / 1000).toFixed(1)}k` : String(item.insightfulCount)}
          active={item.isInsightful}
          onClick={() => onInsightful(item.id)}
        >
          <Lightbulb size={19} strokeWidth={item.isInsightful ? 2.5 : 1.8} fill={item.isInsightful ? 'currentColor' : 'none'} />
        </SidebarAction>
        <SidebarAction label={item.isSaved ? 'Saved' : 'Save'} active={item.isSaved} onClick={() => onSave(item.id)}>
          <Bookmark size={19} strokeWidth={item.isSaved ? 2.5 : 1.8} fill={item.isSaved ? 'currentColor' : 'none'} />
        </SidebarAction>
        <SidebarAction label="Share" onClick={() => onShare(item.id)}>
          <Share2 size={18} strokeWidth={1.8} />
        </SidebarAction>
        <SidebarAction label="Video" onClick={handleGenVideo}>
          <Clapperboard size={18} strokeWidth={1.8} />
        </SidebarAction>
      </div>

      {/* ── Scroll hint ────────────────────────────────────────── */}
      <div className="flex-shrink-0 py-1.5 flex items-center justify-center gap-1.5"
        style={{ color: 'var(--text-faint)', borderTop: '1px solid var(--line)' }}>
        <ChevronDown size={12} strokeWidth={2} />
        <span className="font-mono text-[9.5px] tracking-wider">next briefing</span>
        <ChevronDown size={12} strokeWidth={2} />
      </div>
    </div>
  )
}

function SidebarAction({
  children, label, active, onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 border-none bg-transparent cursor-pointer p-0"
      style={{ color: active ? 'var(--gold)' : 'var(--text-secondary)' }}>
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
        style={{
          background: active ? 'rgba(212,168,67,0.12)' : 'rgba(20,28,48,0.88)',
          border: `1.5px solid ${active ? 'rgba(212,168,67,0.45)' : 'rgba(255,255,255,0.1)'}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: active ? '0 0 14px rgba(212,168,67,0.18)' : 'none',
        }}
      >
        {children}
      </div>
      <span className="font-sans text-[10px] font-semibold tracking-wide">{label}</span>
    </button>
  )
}
