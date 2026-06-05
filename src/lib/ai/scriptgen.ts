import Anthropic from '@anthropic-ai/sdk'
import { SCRIPT_SYSTEM_PROMPT, buildScriptPrompt } from './prompts'
import type { ScriptGenerationInput, VideoScript } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 500

/**
 * Generate a 15-second professional video briefing script.
 * Structured as: HOOK → CORE UPDATE → WHY IT MATTERS → SOURCE
 */
export async function generateVideoScript(
  input: ScriptGenerationInput
): Promise<VideoScript> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SCRIPT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildScriptPrompt(input),
      },
    ],
  })

  const fullScript =
    message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  // Parse the script into structured sections
  const sections = parseScriptSections(fullScript)

  return {
    ...sections,
    fullScript,
    wordCount: fullScript.split(/\s+/).filter(Boolean).length,
  }
}

/**
 * Stream a script generation for real-time typewriter UI effect.
 * Yields text chunks as they arrive from the API.
 */
export async function* streamVideoScript(
  input: ScriptGenerationInput
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SCRIPT_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildScriptPrompt(input),
      },
    ],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}

/**
 * Heuristically split a flat script string into its structural sections.
 * Scripts may not have explicit labels, so we split by sentence count.
 */
function parseScriptSections(script: string): Omit<VideoScript, 'fullScript' | 'wordCount'> {
  const sentences = script
    .replace(/\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)

  const total = sentences.length
  const hookEnd = Math.max(1, Math.floor(total * 0.15))
  const coreEnd = Math.max(hookEnd + 1, Math.floor(total * 0.75))
  const matterEnd = Math.max(coreEnd + 1, total - 1)

  const hook = sentences.slice(0, hookEnd).join(' ')
  const coreUpdate = sentences.slice(hookEnd, coreEnd).join(' ')
  const whyItMatters = sentences.slice(coreEnd, matterEnd).join(' ')
  const sourceAttrib = sentences.slice(matterEnd).join(' ') || `Source: Fiscus Intelligence`

  return { hook, coreUpdate, whyItMatters, sourceAttrib }
}
