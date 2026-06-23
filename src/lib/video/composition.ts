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
const MS_PER_WORD = 380 // ≈ 158 wpm — calm, institutional pace
const BASE_PAD_MS = 900

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
    const visual = buildVisual(s, input, realSeries)
    if (!visual) return // e.g. chart requested but no real data
    scenes.push({
      id: `${input.articleId ?? 'comp'}-${i}-${s.kind}`,
      narration: s.narration.trim(),
      durationMs: durationFor(visual.type, s.narration),
      visual,
    })
  })

  // Always guarantee a closing source attribution.
  if (!scenes.some((s) => s.visual.type === 'outro')) {
    scenes.push(makeOutro(input, scenes.length))
  }

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

function makeOutro(input: CompositionInput, index: number): VideoScene {
  const narration = `Source: ${input.source}, via Fiscus.`
  return {
    id: `${input.articleId ?? 'comp'}-${index}-outro`,
    narration,
    durationMs: durationFor('outro', narration),
    visual: { type: 'outro', source: input.source, tagline: 'Fiscus Intelligence' },
  }
}

// ─── Deterministic fallback ─────────────────────────────────────────────
// Builds a sound, honest video from article fields with NO model call. Used
// when the AI is unavailable/slow/invalid, so the feed always has something
// real to play. Uses only data we actually have — no invented figures.
export function buildFallbackComposition(input: CompositionInput): VideoComposition {
  const scenes: AiScene[] = []

  // 1) Title — the headline beat.
  scenes.push({
    kind: 'title',
    narration: input.headline,
    headline: input.headline,
    ticker: input.ticker,
    sector: input.sector,
  })

  // 2) Stat — only if we have a real, live price/move for this ticker.
  if (input.price != null) {
    scenes.push({
      kind: 'stat',
      narration: `${input.company} last traded at ${formatPrice(input.price)}${
        input.change != null ? `, ${formatDelta(input.change)} on the session.` : '.'
      }`,
      value: formatPrice(input.price),
      label: `${input.ticker} · last`,
      delta: input.change ?? null,
      caption: input.change != null ? `${formatDelta(input.change)} today` : undefined,
    })
  }

  // 3) Chart — only if a real series was supplied (dropped otherwise).
  if (input.series && input.series.length >= 2) {
    scenes.push({
      kind: 'chart',
      narration: 'Recent price action for context.',
      label: `${input.ticker} · recent`,
    })
  }

  // 4) Bullets — the article summary, broken into key points.
  const sentences = splitSentences(input.summary || input.headline)
  if (sentences.length > 0) {
    scenes.push({
      kind: 'bullets',
      narration: input.summary || input.headline,
      heading: 'The update',
      points: sentences.slice(0, 3),
    })
  }

  // 5) Outro — source attribution (normaliser guarantees this anyway).
  scenes.push({
    kind: 'outro',
    narration: `Source: ${input.source}, via Fiscus.`,
    source: input.source,
  })

  return normalizeComposition(input, scenes, 'fallback')
}

function formatPrice(p: number): string {
  return `$${p.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDelta(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}
