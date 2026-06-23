'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Quote as QuoteIcon, TrendingUp, TrendingDown } from 'lucide-react'
import type {
  SceneVisual,
  TitleVisual,
  StatVisual,
  ChartVisual,
  BulletsVisual,
  QuoteVisual,
  OutroVisual,
} from '@/types'

const GREEN = '#22d48a'
const RED = '#ff4f4f'
const GOLD = '#e8b84b'

/** Shared full-bleed stage every scene sits on. */
function Stage({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
      style={{ background: '#05081a' }}>
      {/* accent glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 90% 60% at 50% 38%, ${accent}1f 0%, transparent 65%)`,
      }} />
      <div className="absolute inset-0 chart-grid pointer-events-none" style={{ opacity: 0.25 }} />
      <div className="relative w-full flex flex-col items-center" style={{ animation: 'sceneIn 0.5s ease both' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Title ──────────────────────────────────────────────────────────────
function TitleScene({ v, accent }: { v: TitleVisual; accent: string }) {
  return (
    <Stage accent={accent}>
      {(v.ticker || v.sector) && (
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase mb-5 px-3 py-1 rounded-md"
          style={{ color: accent, background: `${accent}1a`, border: `1px solid ${accent}30` }}>
          {[v.ticker, v.sector].filter(Boolean).join(' · ')}
        </span>
      )}
      <h1 className="font-serif font-semibold"
        style={{ fontSize: 30, lineHeight: 1.18, letterSpacing: '-0.02em', color: '#eef2ff', textShadow: '0 2px 30px rgba(0,0,0,0.8)' }}>
        {v.headline}
      </h1>
    </Stage>
  )
}

// ─── Stat ───────────────────────────────────────────────────────────────
function StatScene({ v, accent }: { v: StatVisual; accent: string }) {
  const up = v.delta == null ? null : v.delta >= 0
  const deltaColor = up == null ? accent : up ? GREEN : RED
  return (
    <Stage accent={accent}>
      <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase mb-4"
        style={{ color: 'rgba(255,255,255,0.55)' }}>
        {v.label}
      </span>
      <span className="font-mono font-bold" style={{
        fontSize: 60, letterSpacing: '-0.03em', color: 'rgba(238,242,255,0.95)',
        textShadow: '0 2px 40px rgba(0,0,0,0.9)', animation: 'statPop 0.55s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {v.value}
      </span>
      {v.delta != null && (
        <span className="inline-flex items-center gap-1 font-mono font-bold mt-3 px-2.5 py-1 rounded-lg"
          style={{ fontSize: 16, color: deltaColor, background: `${deltaColor}14`, border: `1px solid ${deltaColor}33` }}>
          {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {up ? '+' : ''}{v.delta.toFixed(2)}%
        </span>
      )}
      {v.caption && (
        <p className="font-sans mt-5 max-w-[80%]" style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(238,242,255,0.6)' }}>
          {v.caption}
        </p>
      )}
    </Stage>
  )
}

// ─── Chart ──────────────────────────────────────────────────────────────
function ChartScene({ v, accent }: { v: ChartVisual; accent: string }) {
  const positive = v.positive ?? (v.series[v.series.length - 1] >= v.series[0])
  const color = positive ? GREEN : RED
  const data = v.series.map((value) => ({ value }))
  return (
    <Stage accent={accent}>
      {v.label && (
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase mb-4"
          style={{ color: 'rgba(255,255,255,0.55)' }}>
          {v.label}
        </span>
      )}
      <div className="w-full" style={{ height: 200, animation: 'chartDraw 0.7s ease both' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="sceneChart" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.4}
              fill="url(#sceneChart)" dot={false} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {v.caption && (
        <p className="font-sans mt-4 max-w-[82%]" style={{ fontSize: 13.5, lineHeight: 1.5, color: 'rgba(238,242,255,0.6)' }}>
          {v.caption}
        </p>
      )}
    </Stage>
  )
}

// ─── Bullets ────────────────────────────────────────────────────────────
function BulletScene({ v, accent }: { v: BulletsVisual; accent: string }) {
  return (
    <Stage accent={accent}>
      {v.heading && (
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase mb-5"
          style={{ color: accent }}>
          {v.heading}
        </span>
      )}
      <div className="flex flex-col gap-3.5 w-full max-w-[88%]">
        {v.points.map((point, i) => (
          <div key={i} className="flex items-start gap-3 text-left"
            style={{ animation: `bulletIn 0.5s ease both`, animationDelay: `${i * 0.16}s` }}>
            <span className="flex-shrink-0 mt-1.5 rounded-full"
              style={{ width: 7, height: 7, background: accent, boxShadow: `0 0 8px ${accent}` }} />
            <span className="font-sans font-medium" style={{ fontSize: 17, lineHeight: 1.4, color: 'rgba(238,242,255,0.92)' }}>
              {point}
            </span>
          </div>
        ))}
      </div>
    </Stage>
  )
}

// ─── Quote ──────────────────────────────────────────────────────────────
function QuoteScene({ v, accent }: { v: QuoteVisual; accent: string }) {
  return (
    <Stage accent={accent}>
      <QuoteIcon size={34} style={{ color: accent, opacity: 0.7, marginBottom: 14 }} />
      <p className="font-serif font-medium"
        style={{ fontSize: 23, lineHeight: 1.38, letterSpacing: '-0.01em', color: '#eef2ff', maxWidth: '90%' }}>
        “{v.text}”
      </p>
      {v.attribution && (
        <span className="font-mono text-[12px] tracking-wide mt-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          — {v.attribution}
        </span>
      )}
    </Stage>
  )
}

// ─── Outro ──────────────────────────────────────────────────────────────
function OutroScene({ v, accent }: { v: OutroVisual; accent: string }) {
  return (
    <Stage accent={accent}>
      <div className="flex items-center justify-center mb-5 rounded-2xl"
        style={{ width: 64, height: 64, background: `${GOLD}14`, border: `1px solid ${GOLD}3a`, boxShadow: `0 0 26px ${GOLD}22` }}>
        <span className="font-serif font-bold" style={{ fontSize: 30, color: GOLD }}>F</span>
      </div>
      <span className="font-serif font-semibold tracking-tight" style={{ fontSize: 22, color: '#eef2ff' }}>
        {v.tagline ?? 'Fiscus Intelligence'}
      </span>
      <span className="font-mono text-[12px] tracking-wide mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Source: {v.source}
      </span>
    </Stage>
  )
}

// ─── Renderer ───────────────────────────────────────────────────────────
export function SceneRenderer({ visual, accent }: { visual: SceneVisual; accent: string }) {
  switch (visual.type) {
    case 'title':   return <TitleScene v={visual} accent={accent} />
    case 'stat':    return <StatScene v={visual} accent={accent} />
    case 'chart':   return <ChartScene v={visual} accent={accent} />
    case 'bullets': return <BulletScene v={visual} accent={accent} />
    case 'quote':   return <QuoteScene v={visual} accent={accent} />
    case 'outro':   return <OutroScene v={visual} accent={accent} />
    default:        return null
  }
}
