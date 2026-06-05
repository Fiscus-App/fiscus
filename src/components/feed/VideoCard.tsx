'use client'

import { useState, useCallback } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
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

  const chartColor = item.change != null
    ? item.change >= 0 ? '#2ed494' : '#ff5252'
    : '#5b8af5'

  const chartData = item.chartData?.map((v) => ({ v })) ?? []

  // ── AI Script Generation ─────────────────────────────────────────
  const handleGenerateAI = useCallback(async () => {
    if (aiLoading || aiDone) return
    setAiLoading(true)

    try {
      const res = await fetch('/api/articles/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: item.ticker,
          company: item.company,
          headline: item.headline,
          teaser: item.teaser,
          sector: item.sector,
          category: item.category,
          change: item.change,
          price: item.price,
          source: item.source,
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
      setAiScript(
        'Unable to generate live briefing. The preview above is sourced from verified financial reporting.'
      )
      setAiDone(true)
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiDone, item])

  // ── Video Generation ─────────────────────────────────────────────
  const handleGenVideo = useCallback(async () => {
    if (videoGenerating || videoReady) return
    setVideoGenerating(true)

    try {
      await fetch('/api/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: item.id }),
      })
      // Poll for completion (simplified — production uses webhooks/SSE)
      await new Promise((r) => setTimeout(r, 7000))
      setVideoReady(true)
    } catch {
      // silent fail, user can retry
    } finally {
      setVideoGenerating(false)
    }
  }, [videoGenerating, videoReady, item.id])

  // ── Play Animation ───────────────────────────────────────────────
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
    <div
      className="flex flex-col overflow-hidden relative"
      style={{ height, background: 'var(--bg)' }}
    >
      {/* ── Visual header ─────────────────────────────────────── */}
      <div
        className="flex-shrink-0 relative overflow-hidden chart-grid"
        style={{ height: 158, background: 'var(--bg-3)', borderBottom: '1px solid var(--line)' }}
      >
        {/* Scanline */}
        <div
          className="scan-line absolute left-0 right-0 pointer-events-none"
          style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}
        />

        <div className="absolute inset-0 p-3.5 flex flex-col justify-between">
          {/* Top row */}
          <div className="flex items-start justify-between">
            <div>
              <SourceBadge source={item.source} credibility={item.sourceType} />
              <div className="mt-1.5 font-mono text-[9.5px] text-text-muted tracking-wider">
                {item.publishedAt} · {item.category}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={videoReady ? handlePlay : handleGenVideo}
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all',
                  'border border-white/20 backdrop-blur-md',
                  playing
                    ? 'bg-gold/20 border-gold/40'
                    : 'bg-black/60 hover:bg-gold/20 hover:border-gold/40'
                )}
                style={{ color: playing ? 'var(--gold)' : 'var(--text-secondary)' }}
                title={videoReady ? 'Play briefing' : 'Generate video'}
              >
                {videoGenerating ? '⟳' : videoReady ? '▶' : '⬛'}
              </button>
              <div className="flex items-center gap-1 font-mono text-[9px] text-text-muted tracking-widest">
                <span
                  className="live-dot inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--green)' }}
                />
                LIVE
              </div>
            </div>
          </div>

          {/* Price + Chart */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono text-[11.5px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  color: item.sectorColor,
                  background: `${item.sectorColor}1a`,
                  letterSpacing: '0.07em',
                }}
              >
                {item.ticker}
              </span>
              <span className="text-[10.5px] text-text-muted uppercase tracking-wide">
                {item.sector}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              {item.price != null && (
                <span className="font-mono text-[19px] font-medium">
                  ${item.price.toFixed(2)}
                </span>
              )}
              {item.change != null && (
                <span
                  className="font-mono text-sm font-medium"
                  style={{ color: item.change >= 0 ? 'var(--green)' : 'var(--red)' }}
                >
                  {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                </span>
              )}
            </div>
            {chartData.length > 0 && (
              <div style={{ height: 50 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id={`g-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={chartColor}
                      strokeWidth={1.5}
                      fill={`url(#g-${item.id})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-[2px] transition-none"
          style={{
            width: `${progress}%`,
            background: 'var(--gold)',
            transition: playing ? 'width 0.1s linear' : 'none',
          }}
        />
        {(videoReady || playing) && (
          <div className="absolute bottom-1.5 right-2.5 font-mono text-[9px] text-text-muted tracking-wide">
            {playing ? '▶ Playing 15s briefing...' : '▶ Ready to play'}
          </div>
        )}
      </div>

      {/* ── Scrollable body ────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-3 scroll-y"
        style={{ paddingRight: 64 }}
      >
        <h2 className="font-serif text-[16.5px] font-medium leading-snug mb-2.5">
          {item.headline}
        </h2>

        {/* AI Briefing Box */}
        <div
          className="rounded-lg p-3 mb-2"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <div
            className="flex items-center gap-1.5 mb-2 text-[9.5px] font-bold uppercase tracking-widest"
            style={{ color: aiDone ? 'var(--gold)' : 'var(--text-muted)' }}
          >
            <span className="text-sm">✦</span>
            {aiDone ? 'AI Briefing · Live Generated' : 'Preview Briefing'}
          </div>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {aiDone && aiScript ? aiScript : item.script}
            {aiLoading && <span className="cursor ml-0.5">|</span>}
          </p>
          {!aiDone && (
            <button
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="mt-2 px-3 py-1.5 rounded text-[11px] font-semibold tracking-wide transition-all disabled:opacity-40"
              style={{
                background: 'var(--gold-a)',
                color: 'var(--gold)',
                border: '1px solid var(--gold-b)',
              }}
            >
              {aiLoading ? '⟳ Generating live briefing...' : '✦ Regenerate with Live AI'}
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10.5px] px-2 py-0.5 rounded font-medium"
              style={{
                background: 'var(--bg-3)',
                color: 'var(--text-muted)',
                border: '1px solid var(--line)',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Trust footer */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <div className="flex items-start justify-between">
            <div className="text-[11px] text-text-muted leading-7">
              <div>
                📰 Source:{' '}
                <span className="text-text-secondary font-medium">{item.source}</span>
              </div>
              <div>🕐 Published {item.publishedAt}</div>
              <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                ℹ Summaries are informational only — not financial advice
              </div>
            </div>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold flex-shrink-0 ml-2"
              style={{ color: 'var(--blue)' }}
            >
              View source ↗
            </a>
          </div>
        </div>
        <div style={{ height: 8 }} />
      </div>

      {/* ── Sidebar actions ────────────────────────────────────── */}
      <div className="absolute right-3 flex flex-col items-center gap-3.5" style={{ bottom: 68 }}>
        <SidebarAction
          label={
            item.insightfulCount > 999
              ? `${(item.insightfulCount / 1000).toFixed(1)}k`
              : String(item.insightfulCount)
          }
          active={item.isInsightful}
          onClick={() => onInsightful(item.id)}
        >
          💡
        </SidebarAction>
        <SidebarAction
          label={item.isSaved ? 'Saved' : 'Save'}
          active={item.isSaved}
          onClick={() => onSave(item.id)}
        >
          🔖
        </SidebarAction>
        <SidebarAction label="Share" onClick={() => onShare(item.id)}>
          ↗
        </SidebarAction>
        <SidebarAction label="Video" onClick={handleGenVideo}>
          ⬛
        </SidebarAction>
      </div>

      {/* ── Scroll hint ────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 py-1.5 text-center font-mono text-[10px] tracking-wider"
        style={{ color: 'var(--text-faint)', borderTop: '1px solid var(--line)' }}
      >
        ↓ next briefing
      </div>
    </div>
  )
}

function SidebarAction({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 p-0 border-none bg-transparent cursor-pointer"
      style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[17px] transition-all"
        style={{
          background: active ? 'var(--gold-a)' : 'rgba(14,18,36,0.8)',
          border: `1px solid ${active ? 'var(--gold-b)' : 'var(--line-2)'}`,
          backdropFilter: 'blur(4px)',
        }}
      >
        {children}
      </div>
      <span className="font-sans text-[10px] font-semibold">{label}</span>
    </button>
  )
}
