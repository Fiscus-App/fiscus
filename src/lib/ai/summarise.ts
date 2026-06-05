import Anthropic from '@anthropic-ai/sdk'
import { SUMMARY_SYSTEM_PROMPT, buildSummaryPrompt } from './prompts'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Generate a concise teaser summary (25–35 words) from an article.
 */
export async function summariseArticle(
  title: string,
  bodyText: string
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // cheaper model for summarisation
    max_tokens: 150,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildSummaryPrompt(title, bodyText),
      },
    ],
  })

  return message.content[0].type === 'text'
    ? message.content[0].text.trim()
    : title
}

/**
 * Extract related ASX tickers mentioned in article text.
 */
export async function extractTickers(text: string): Promise<string[]> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    system:
      'You are a financial data parser. Extract all ASX ticker symbols mentioned in the provided text. Return ONLY a JSON array of uppercase ticker strings, e.g. ["BHP","CBA","RIO"]. If none, return []. No explanation.',
    messages: [{ role: 'user', content: text.slice(0, 3000) }],
  })

  try {
    const raw =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/**
 * Classify the sector of an article.
 */
export async function classifySector(
  title: string,
  text: string
): Promise<string> {
  const sectors = [
    'Banking',
    'Mining',
    'Energy',
    'Technology',
    'Property',
    'Retail',
    'Healthcare',
    'Macroeconomics',
    'Interest Rates',
    'M&A',
    'Industrials',
    'Utilities',
    'Consumer Staples',
  ]

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 20,
    system: `You are a financial sector classifier. Given a news article title and excerpt, return ONLY one sector name from this list: ${sectors.join(', ')}. Return only the sector name, nothing else.`,
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\nExcerpt: ${text.slice(0, 500)}`,
      },
    ],
  })

  const result =
    message.content[0].type === 'text' ? message.content[0].text.trim() : 'Macroeconomics'

  return sectors.includes(result) ? result : 'Macroeconomics'
}
