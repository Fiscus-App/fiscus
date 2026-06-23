import Anthropic from '@anthropic-ai/sdk'
import { SCENE_SYSTEM_PROMPT, buildScenePrompt } from './prompts'
import {
  aiCompositionSchema,
  buildFallbackComposition,
  normalizeComposition,
} from '@/lib/video/composition'
import type { CompositionInput, VideoComposition } from '@/types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1200

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Generate a full video composition for an article by asking the model to
 * write a scene plan, then validating + normalising it. ANY failure (no key,
 * bad JSON, schema mismatch, empty result) degrades gracefully to the
 * deterministic fallback, so callers always receive a valid, playable video.
 */
export async function generateComposition(
  input: CompositionInput,
): Promise<VideoComposition> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return buildFallbackComposition(input)
  }

  try {
    const hasRealChart = !!(input.series && input.series.length >= 2)

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SCENE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildScenePrompt({
            ticker: input.ticker,
            company: input.company,
            headline: input.headline,
            summary: input.summary,
            bodyText: input.bodyText,
            sector: input.sector,
            category: input.category,
            source: input.source,
            hasRealChart,
          }),
        },
      ],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const parsed = aiCompositionSchema.parse(extractJson(raw))
    const composition = normalizeComposition(input, parsed.scenes, 'ai')

    // A degenerate plan (everything dropped) is worse than the fallback.
    if (composition.scenes.length < 2) return buildFallbackComposition(input)
    return composition
  } catch {
    return buildFallbackComposition(input)
  }
}

/**
 * Pull the first JSON object out of a model response, tolerating code fences
 * or stray prose around it.
 */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response')
  }
  return JSON.parse(candidate.slice(start, end + 1))
}
