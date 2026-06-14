import Anthropic from '@anthropic-ai/sdk'
import { SUMMARY_SYSTEM_PROMPT, buildSummaryPrompt } from './prompts'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Finance Relevance Screener ───────────────────────────────────────────────
// Returns true if the article is relevant to financial markets / investing.
// Runs before AI summarisation so off-topic content never gets a summary.

const FINANCE_KEYWORDS = [
  // Markets & instruments
  'asx', 'stock', 'share', 'equity', 'market', 'index', 'bond', 'yield', 'etf',
  'fund', 'ipo', 'listing', 'dividend', 'earnings', 'profit', 'revenue', 'ebitda',
  // Economy
  'rba', 'rate', 'inflation', 'cpi', 'gdp', 'recession', 'fiscal', 'budget',
  'treasury', 'economy', 'economic', 'monetary', 'trade', 'deficit', 'surplus',
  // Corporate events
  'acquisition', 'merger', 'takeover', 'buyout', 'demerger', 'ipo', 'capital raise',
  'placement', 'buyback', 'write-down', 'impairment', 'guidance', 'outlook',
  // Asset classes / commodities
  'iron ore', 'gold', 'copper', 'lithium', 'oil', 'gas', 'lng', 'coal', 'uranium',
  'commodity', 'fx', 'currency', 'aud', 'usd', 'dollar', 'crypto', 'bitcoin',
  // Institutions / roles
  'ceo', 'cfo', 'chairman', 'board', 'analyst', 'broker', 'fund manager',
  'investor', 'shareholder', 'portfolio', 'hedge fund', 'super fund',
  // Company names / tickers commonly mentioned
  'bhp', 'cba', 'rio', 'csl', 'nab', 'anz', 'westpac', 'macquarie', 'wesfarmers',
  'woodside', 'fortescue', 'telstra', 'woolworths', 'afterpay', 'xero',
  // Financial platforms / exchanges
  'nasdaq', 'nyse', 's&p', 'dow jones', 'federal reserve', 'fed ', 'ecb',
]

/**
 * Fast keyword pre-screen — no API call, zero cost.
 * Returns true if the title/body has at least one finance keyword.
 */
export function isFinanceRelevantFast(title: string, bodyText: string): boolean {
  const combined = `${title} ${bodyText}`.toLowerCase()
  return FINANCE_KEYWORDS.some(kw => combined.includes(kw))
}

/**
 * AI finance relevance check — only called when the keyword screen passes
 * but we want higher confidence (e.g. for broadsheet sources that mix topics).
 * Returns { relevant: boolean, reason: string }.
 */
export async function checkFinanceRelevance(
  title: string,
  bodyText: string
): Promise<{ relevant: boolean; reason: string }> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 60,
    system:
      'You are a financial news filter. Decide if this article is directly relevant to: financial markets, ASX/listed companies, investing, economics, monetary policy, commodities, or corporate events. Reply with JSON only: {"relevant": true/false, "reason": "one sentence"}.',
    messages: [
      {
        role: 'user',
        content: `Title: ${title}\n\nExcerpt: ${bodyText.slice(0, 400)}`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?|\n?```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { relevant: true, reason: 'parse error — defaulting to keep' }
  }
}

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
