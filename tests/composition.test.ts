import { describe, it, expect } from 'vitest'
import {
  buildFallbackComposition,
  normalizeComposition,
  COMPOSITION_VERSION,
} from '@/lib/video/composition'
import type { CompositionInput } from '@/types'

const baseInput: CompositionInput = {
  articleId: 'art_1',
  ticker: 'CBA',
  company: 'Commonwealth Bank',
  headline: 'Commonwealth Bank lifts half-year profit to $5.1B',
  summary:
    'Commonwealth Bank reported a half-year cash profit of $5.1 billion, up 4 percent. Net interest margin held at 1.99 percent. The board declared a $2.25 interim dividend.',
  bodyText: 'Full article body…',
  sector: 'Financials',
  sectorColor: '#5b8af5',
  category: 'Earnings',
  source: 'AFR',
  change: 1.8,
  price: 114.32,
  series: [110, 111.2, 112.8, 113.1, 114.32],
}

describe('buildFallbackComposition', () => {
  it('builds a valid, playable composition from a rich article', () => {
    const c = buildFallbackComposition(baseInput)
    expect(c.version).toBe(COMPOSITION_VERSION)
    expect(c.generator).toBe('fallback')
    expect(c.scenes.length).toBeGreaterThanOrEqual(2)

    const kinds = c.scenes.map((s) => s.visual.type)
    expect(kinds[0]).toBe('title')          // always opens on the headline
    expect(kinds).toContain('stat')          // real price → stat scene
    expect(kinds).toContain('chart')         // real series → chart scene
    expect(kinds[kinds.length - 1]).toBe('outro') // always closes on source
  })

  it('total duration equals the sum of scene durations', () => {
    const c = buildFallbackComposition(baseInput)
    const sum = c.scenes.reduce((acc, s) => acc + s.durationMs, 0)
    expect(c.totalDurationMs).toBe(sum)
    expect(c.totalDurationMs).toBeGreaterThan(0)
  })

  it('omits stat and chart when there is no real price or series (no ghost data)', () => {
    const c = buildFallbackComposition({
      ...baseInput,
      price: null,
      change: null,
      series: null,
    })
    const kinds = c.scenes.map((s) => s.visual.type)
    expect(kinds).not.toContain('stat')
    expect(kinds).not.toContain('chart')
    expect(kinds).toContain('outro')
    expect(c.scenes.length).toBeGreaterThanOrEqual(2)
  })
})

describe('normalizeComposition', () => {
  it('drops a chart scene the model requested when no real series exists', () => {
    const c = normalizeComposition(
      { ...baseInput, series: null },
      [
        { kind: 'title', narration: 'Headline beat.', headline: 'H' },
        { kind: 'chart', narration: 'Look at the price.' },
      ],
      'ai',
    )
    expect(c.scenes.map((s) => s.visual.type)).not.toContain('chart')
  })

  it('always appends a closing outro even if the model omits it', () => {
    const c = normalizeComposition(
      baseInput,
      [{ kind: 'title', narration: 'Just a title.', headline: 'H' }],
      'ai',
    )
    expect(c.scenes[c.scenes.length - 1].visual.type).toBe('outro')
  })

  it('clamps every scene duration into a sane range', () => {
    const c = buildFallbackComposition(baseInput)
    for (const s of c.scenes) {
      expect(s.durationMs).toBeGreaterThanOrEqual(2000)
      expect(s.durationMs).toBeLessThanOrEqual(7000)
    }
  })
})
