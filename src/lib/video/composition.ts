import { z } from 'zod'
import type {
  CompositionInput,
  SceneVisual,
  VideoComposition,
  VideoScene,
} from '@/types'

// ─── Tunables ───────────────────────────────────────────────────────────
// Per-scene timing. Scene length tracks its narration length, so when real
// TTS audio arrives the visual timeline already matches the spoken duration.
export const COMPOSITION_VERSION = 1
const MS_PER_WORD = 360 // ≈ 167 wpm — calm, institutional pace
const BASE_PAD_MS = 650

const DURATION_BOUNDS: Record<SceneVisual['type'], { min: number; max: number }> = {
  title: { min: 2600, max: 5000 },
  stat: { min: 2600, max: 5000 },
  chart: { min: 3200, max: 6000 },
  bullets: { min: 3600, max: 7000 },
  quote: { min: 3000, max: 6500 },
  outro: { min: 2200, max: 4000 },
}

function durationFor(kind: SceneVisual['type'], narration: string): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length
  const raw = words * MS_PER_WORD + BASE_PAD_MS
  const { min, max } = DURATION_BOUNDS[kind]
  return Math.round(Math.min(Math.max(raw, min), max))
}

// ─── Text helpers ───────────────────────────────────────────────────────
function splitSentences(text: string): string[] {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function inferPositive(series: number[]): boolean {
  if (series.length < 2) return true
  return series[series.length - 1] >= series[0]
}

// ─── AI output validation ───────────────────────────────────────────────
// The model returns loosely-typed scenes; we validate then normalise. Note
// chart series are NEVER taken from the model — only real data is attached
// later — so the AI can request a chart but cannot invent prices.
const aiSceneSchema = z.object({
  kind: z.enum(['title', 'stat', 'chart', 'bullets', 'quote', 'outro']),
  narration: z.string().min(1),
  headline: z.string().optional(),
  ticker: z.string().optional(),
  sector: z.string().optional(),
  value: z.string().optional(),
  label: z.string().optional(),
  delta: z.number().nullable().optional(),
  caption: z.string().optional(),
  heading: z.string().optional(),
  points: z.array(z.string()).optional(),
  text: z.string().optional(),
  attribution: z.string().optional(),
  source: z.string().optional(),
})

export const aiCompositionSchema = z.object({
  scenes: z.array(aiSceneSchema).min(2).max(8),
})

export type AiScene = z.infer<typeof aiSceneSchema>

// ─── Normalisation ──────────────────────────────────────────────────────
// Turn validated AI scenes (or hand-built ones) into a final composition:
// attach real chart data, drop chart scenes with no real series, clamp
// durations, assign ids and recompute the total.
export function normalizeComposition(
  input: CompositionInput,
  aiScenes: AiScene[],
  generator: 'ai' | 'fallback',
): VideoComposition {
  const realSeries = input.series && input.series.length >= 2 ? input.series : null
  const scenes: VideoScene[] = []

  aiScenes.forEach((s, i) => {
    // No intro/outro: the headline, source and ticker are already shown in the
    // UI, so drop any title/outro scene the model emits, plus bare source or
    // sign-off lines. Every second of the clip must carry article content.
    if (s.kind === 'title' || s.kind === 'outro') return
    if (isSourceOrSignoff(s.narration)) return
    const visual = buildVisual(s, input, realSeries)
    if (!visual) return // e.g. chart requested but no real data
    scenes.push({
      id: `${input.articleId ?? 'comp'}-${i}-${s.kind}`,
      narration: s.narration.trim(),
      durationMs: durationFor(visual.type, s.narration),
      visual,
    })
  })

  const totalDurationMs = scenes.reduce((sum, s) => sum + s.durationMs, 0)

  return {
    version: COMPOSITION_VERSION,
    articleId: input.articleId,
    ticker: input.ticker,
    sector: input.sector,
    accent: input.sectorColor,
    totalDurationMs,
    scenes,
    generator,
    generatedAt: new Date().toISOString(),
  }
}

function buildVisual(
  s: AiScene,
  input: CompositionInput,
  realSeries: number[] | null,
): SceneVisual | null {
  switch (s.kind) {
    case 'title':
      return {
        type: 'title',
        headline: s.headline?.trim() || input.headline,
        ticker: s.ticker?.trim() || input.ticker,
        sector: s.sector?.trim() || input.sector,
      }
    case 'stat': {
      const value = s.value?.trim()
      if (!value) return null // a stat with no number is meaningless
      return {
        type: 'stat',
        value,
        label: s.label?.trim() || input.category,
        delta: s.delta ?? input.change ?? null,
        caption: s.caption?.trim(),
      }
    }
    case 'chart': {
      if (!realSeries) return null // never invent a price series
      return {
        type: 'chart',
        series: realSeries,
        label: s.label?.trim() || `${input.ticker} · recent`,
        positive: input.change != null ? input.change >= 0 : inferPositive(realSeries),
        caption: s.caption?.trim(),
      }
    }
    case 'bullets': {
      const points = (s.points ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 4)
      if (points.length === 0) return null
      return { type: 'bullets', heading: s.heading?.trim(), points }
    }
    case 'quote': {
      const text = s.text?.trim()
      if (!text) return null
      return { type: 'quote', text, attribution: s.attribution?.trim() }
    }
    case 'outro':
      return { type: 'outro', source: s.source?.trim() || input.source, tagline: 'Fiscus Intelligence' }
    default:
      return null
  }
}

/** Detects narration that is just a source credit or sign-off, not content. */
function isSourceOrSignoff(narration: string): boolean {
  const n = narration.trim().toLowerCase()
  if (n.length === 0) return true
  return /^(source|via|reporting|courtesy|credit)\b/.test(n) ||
    /\bvia fiscus\b/.test(n) ||
    /\bback to you\b/.test(n)
}

/** Rough information score for a sentence — figures carry the substance. */
function scoreSentence(s: string): number {
  let score = 0
  if (/\d/.test(s)) score += 3
  if (/[%$]/.test(s) || /\b(per ?cent|percent|bps|basis points?|billion|million|trillion)\b/i.test(s)) score += 3
  const words = s.split(/\s+/).length
  if (words >= 8 && words <= 30) score += 1
  return score
}

/**
 * Pick the densest sentences for a deterministic briefing: prefer the ones
 * carrying figures, cap at ~maxWords, and restore original article order so it
 * still reads coherently.
 */
function pickBriefingSentences(text: string, maxWords = 45): string[] {
  const all = splitSentences(text)
  const scored = all.map((s, i) => ({ s, i, score: scoreSentence(s) }))
  const ordered = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
  const pool = ordered.length > 0 ? ordered : scored
  const chosen: { s: string; i: number }[] = []
  let words = 0
  for (const c of pool) {
    const w = c.s.split(/\s+/).length
    if (chosen.length > 0 && words + w > maxWords) break
    chosen.push({ s: c.s, i: c.i })
    words += w
    if (chosen.length >= 3) break
  }
  return chosen.sort((a, b) => a.i - b.i).map((x) => x.s)
}

/** Compress a sentence into a short on-screen bullet. */
function toBullet(s: string): string {
  const words = s.replace(/[.;:]+$/, '').split(/\s+/)
  return words.length <= 9 ? words.join(' ') : words.slice(0, 9).join(' ') + '…'
}

// ─── Deterministic fallback ─────────────────────────────────────────────
// Builds a sound, honest video from article fields with NO model call. Used
// when the AI is unavailable/slow/invalid, so the feed always has something
// real to play. Uses only data we actually have — no invented figures.
export function buildFallbackComposition(input: CompositionInput): VideoComposition {
  const scenes: AiScene[] = []
  const hasStat = input.price != null
  const hasChart = !!(input.series && input.series.length >= 2)

  // Lead with the substance: the densest, figure-bearing sentences from the
  // body (or summary) — NOT a restated headline or a source credit. Trim the
  // word budget to leave room for the stat/chart beats and hit ~15 seconds.
  const sourceText = input.bodyText && input.bodyText.trim().length > 40 ? input.bodyText : input.summary
  const budget = 50 - (hasStat ? 10 : 0) - (hasChart ? 9 : 0)
  const sentences = pickBriefingSentences(sourceText || input.summary || input.headline, Math.max(24, budget))
  if (sentences.length > 0) {
    scenes.push({
      kind: 'bullets',
      narration: sentences.join(' '),
      heading: 'Key points',
      points: sentences.map(toBullet),
    })
  }

  // Market reaction: real, live price/move (never invented).
  if (hasStat) {
    scenes.push({
      kind: 'stat',
      narration: `The stock last traded at ${formatPrice(input.price!)}${
        input.change != null ? `, ${formatDelta(input.change)} on the day.` : '.'
      }`,
      value: formatPrice(input.price!),
      label: `${input.ticker} · last`,
      delta: input.change ?? null,
      caption: input.change != null ? `${formatDelta(input.change)} today` : undefined,
    })
  }

  // Trend: a data-driven line from the real series (no generic filler).
  if (hasChart) {
    scenes.push({ kind: 'chart', narration: seriesMoveLine(input.series!), label: `${input.ticker} · recent` })
  }

  // Guarantee at least one content scene.
  if (scenes.length === 0) {
    const line = input.summary || input.headline
    scenes.push({ kind: 'bullets', narration: line, points: [toBullet(line)] })
  }

  return normalizeComposition(input, scenes, 'fallback')
}

/** Factual one-liner describing the move across a real price series. */
function seriesMoveLine(series: number[]): string {
  const first = series[0]
  const last = series[series.length - 1]
  if (!first) return 'Recent sessions shown for context.'
  const pct = ((last - first) / first) * 100
  const dir = pct >= 0 ? 'risen' : 'fallen'
  return `Across the sessions shown, the stock has ${dir} ${Math.abs(pct).toFixed(1)}%.`
}

function formatPrice(p: number): string {
  return `$${p.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDelta(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}
