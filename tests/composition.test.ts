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
const narrationOf = (c: VideoComposition) => c.scenes.map((s) => s.narration).join(' ')

describe('buildFallbackComposition (content-only, no intro/outro)', () => {
  it('contains NO title or outro scene', () => {
    const kinds = kindsOf(buildFallbackComposition(baseInput))
    expect(kinds).not.toContain('title')
    expect(kinds).not.toContain('outro')
    expect(kinds.length).toBeGreaterThanOrEqual(2)
  })

  it('opens on content, not a title card', () => {
    expect(['stat', 'chart', 'bullets', 'quote']).toContain(kindsOf(buildFallbackComposition(baseInput))[0])
  })

  it('narration does not repeat the headline or name the source', () => {
    const narration = narrationOf(buildFallbackComposition(baseInput)).toLowerCase()
    expect(narration).not.toContain(baseInput.headline.toLowerCase())
    expect(narration).not.toContain('source:')
    expect(narration).not.toContain('via fiscus')
  })

  it('surfaces real figures from the article body', () => {
    expect(/\d/.test(narrationOf(buildFallbackComposition(baseInput)))).toBe(true)
  })

  it('total duration equals the sum of scene durations', () => {
    const c = buildFallbackComposition(baseInput)
    const sum = c.scenes.reduce((a, s) => a + s.durationMs, 0)
    expect(c.totalDurationMs).toBe(sum)
    expect(c.totalDurationMs).toBeGreaterThan(6000)
  })

  it('omits stat and chart when no real price/series (no ghost data)', () => {
    const kinds = kindsOf(
      buildFallbackComposition({ ...baseInput, price: null, change: null, series: null }),
    )
    expect(kinds).not.toContain('stat')
    expect(kinds).not.toContain('chart')
    expect(kinds).not.toContain('title')
    expect(kinds).not.toContain('outro')
  })

  it('is tagged with version + fallback provenance', () => {
    const c = buildFallbackComposition(baseInput)
    expect(c.version).toBe(COMPOSITION_VERSION)
    expect(c.generator).toBe('fallback')
  })
})

describe('normalizeComposition strips intro/outro from AI output', () => {
  it('drops any title and outro scenes the model emits', () => {
    const kinds = kindsOf(
      normalizeComposition(
        baseInput,
        [
          { kind: 'title', narration: 'CBA earnings.', headline: 'H' },
          { kind: 'stat', narration: 'Cash profit rose 4% to $5.1 billion.', value: '$5.1B', label: 'Half-year cash profit' },
          { kind: 'bullets', narration: 'Margin held at 1.99%; dividend lifted to $2.25.', points: ['NIM 1.99%', 'Dividend $2.25'] },
          { kind: 'outro', narration: 'Source: AFR via Fiscus.', source: 'AFR' },
        ],
        'ai',
      ),
    )
    expect(kinds).not.toContain('title')
    expect(kinds).not.toContain('outro')
    expect(kinds).toContain('stat')
    expect(kinds).toContain('bullets')
  })

  it('drops a chart with no real series, keeps it with one', () => {
    const without = normalizeComposition({ ...baseInput, series: null }, [
      { kind: 'stat', narration: 'Profit $5.1B.', value: '$5.1B', label: 'Profit' },
      { kind: 'chart', narration: 'Shares climbed.' },
    ], 'ai')
    expect(kindsOf(without)).not.toContain('chart')

    const withSeries = normalizeComposition(baseInput, [
      { kind: 'stat', narration: 'Profit $5.1B.', value: '$5.1B', label: 'Profit' },
      { kind: 'chart', narration: 'Shares climbed 2.3%.' },
    ], 'ai')
    expect(kindsOf(withSeries)).toContain('chart')
  })

  it('drops bare source / sign-off narration lines', () => {
    const c = normalizeComposition(baseInput, [
      { kind: 'stat', narration: 'Profit $5.1B, up 4%.', value: '$5.1B', label: 'Profit' },
      { kind: 'bullets', narration: 'Source: AFR.', points: ['x'] },
    ], 'ai')
    expect(c.scenes.length).toBe(1)
  })

  it('clamps scene durations into a sane range', () => {
    for (const s of buildFallbackComposition(baseInput).scenes) {
      expect(s.durationMs).toBeGreaterThanOrEqual(2000)
      expect(s.durationMs).toBeLessThanOrEqual(7000)
    }
  })
})
