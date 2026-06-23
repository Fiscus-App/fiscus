import { describe, it, expect } from 'vitest'
import {
  buildFallbackComposition,
  normalizeComposition,
  COMPOSITION_VERSION,
} from '@/lib/video/composition'
import type { CompositionInput, VideoComposition } from '@/types'

const baseInput: CompositionInput = {
  articleId: 'art_1',
  ticker: 'CBA',
  company: 'Commonwealth Bank',
  headline: 'Commonwealth Bank lifts half-year profit to $5.1B',
  summary:
    'Commonwealth Bank reported a half-year cash profit of $5.1 billion, up 4 percent. Net interest margin held at 1.99 percent. The board declared a $2.25 interim dividend.',
  bodyText:
    'Commonwealth Bank reported a half-year cash profit of $5.1 billion, up 4 percent on the prior corresponding period. Net interest margin held steady at 1.99 percent despite intense mortgage competition. The board declared a $2.25 interim dividend, up 5 percent. Management flagged a $350 million lift in loan impairment provisions as arrears edged higher. Shares rose 2.3 percent to $114.32 in early trade.',
  sector: 'Financials',
  sectorColor: '#5b8af5',
  category: 'Earnings',
  source: 'AFR',
  change: 1.8,
  price: 114.32,
  series: [110, 111.2, 112.8, 113.1, 114.32],
}

const kindsOf = (c: VideoComposition) => c.scenes.map((s) => s.visual.type)
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

describe('buildFallbackComposition (V2: story beats, no intro/outro)', () => {
  it('contains no title or outro scene', () => {
    const kinds = kindsOf(buildFallbackComposition(baseInput))
    expect(kinds).not.toContain('title')
    expect(kinds).not.toContain('outro')
    expect(kinds.length).toBeGreaterThanOrEqual(1)
  })

  it('uses statement beats for narrative lines', () => {
    expect(kindsOf(buildFallbackComposition(baseInput))).toContain('statement')
  })

  it('builds a non-empty flowing script that surfaces real figures', () => {
    const c = buildFallbackComposition(baseInput)
    expect(c.script.length).toBeGreaterThan(0)
    expect(wordCount(c.script)).toBeGreaterThan(30)
    expect(/\d/.test(c.script)).toBe(true)
  })

  it('script does not restate the headline or name the source', () => {
    const script = buildFallbackComposition(baseInput).script.toLowerCase()
    expect(script).not.toContain(baseInput.headline.toLowerCase())
    expect(script).not.toContain('source:')
    expect(script).not.toContain('via fiscus')
  })

  it('omits stat and chart when there is no real price/series', () => {
    const kinds = kindsOf(
      buildFallbackComposition({ ...baseInput, price: null, change: null, series: null }),
    )
    expect(kinds).not.toContain('stat')
    expect(kinds).not.toContain('chart')
  })

  it('is tagged as engine v2 + fallback provenance', () => {
    const c = buildFallbackComposition(baseInput)
    expect(COMPOSITION_VERSION).toBe(2)
    expect(c.version).toBe(COMPOSITION_VERSION)
    expect(c.generator).toBe('fallback')
    expect(c.tone).toBeTruthy()
  })
})

describe('normalizeComposition (V2)', () => {
  it('drops title/outro, keeps content beats, and computes script + tone', () => {
    const c = normalizeComposition(
      baseInput,
      [
        { kind: 'title', narration: 'CBA earnings.', headline: 'H' },
        { kind: 'statement', narration: 'Profit jumped, and the market noticed.' },
        { kind: 'stat', narration: 'Cash profit hit $5.1 billion, up 4%.', value: '$5.1B', label: 'Cash profit' },
        { kind: 'outro', narration: 'Source: AFR via Fiscus.', source: 'AFR' },
      ],
      'ai',
      'earnings',
    )
    const kinds = kindsOf(c)
    expect(kinds).not.toContain('title')
    expect(kinds).not.toContain('outro')
    expect(kinds).toContain('statement')
    expect(kinds).toContain('stat')
    expect(c.tone).toBe('earnings')
    expect(c.script).toBe('Profit jumped, and the market noticed. Cash profit hit $5.1 billion, up 4%.')
  })

  it('downgrades a chart with no real series to a statement (keeps the line)', () => {
    const c = normalizeComposition(
      { ...baseInput, series: null },
      [
        { kind: 'statement', narration: 'The stock barely moved.' },
        { kind: 'chart', narration: 'But the trend tells a story.' },
      ],
      'ai',
      'neutral',
    )
    expect(kindsOf(c)).not.toContain('chart')
    expect(c.script).toContain('the trend tells a story')
  })

  it('drops bare source / sign-off lines', () => {
    const c = normalizeComposition(
      baseInput,
      [
        { kind: 'statement', narration: 'Profit jumped 4%.' },
        { kind: 'statement', narration: 'Source: AFR.' },
      ],
      'ai',
      'neutral',
    )
    expect(c.scenes.length).toBe(1)
  })

  it('clamps scene durations into a sane range', () => {
    for (const s of buildFallbackComposition(baseInput).scenes) {
      expect(s.durationMs).toBeGreaterThanOrEqual(2000)
      expect(s.durationMs).toBeLessThanOrEqual(7000)
    }
  })
})
