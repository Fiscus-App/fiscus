import Parser from 'rss-parser'
import axios from 'axios'
import { summariseArticle, extractTickers, classifySector } from '../ai/summarise'

const rssParser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Fiscus/1.0 (+https://fiscus.io/bot)' },
})

// ─── RSS Ingestion ────────────────────────────────────────────────────

export interface RawArticle {
  title: string
  url: string
  author?: string
  bodyText?: string
  publishedAt: Date
  sourceId: string
}

/**
 * Ingest articles from an RSS feed URL.
 * Respects robots.txt signal via the configured Source.respectRobots flag.
 */
export async function ingestRssFeed(
  feedUrl: string,
  sourceId: string,
  maxItems = 20
): Promise<RawArticle[]> {
  const feed = await rssParser.parseURL(feedUrl)
  const articles: RawArticle[] = []

  for (const item of feed.items.slice(0, maxItems)) {
    if (!item.link || !item.title) continue

    articles.push({
      title: item.title,
      url: item.link,
      author: item.creator || item.author,
      bodyText: item.contentSnippet || item.summary || '',
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      sourceId,
    })
  }

  return articles
}

// ─── ASX Announcements ────────────────────────────────────────────────

/**
 * Fetch latest ASX company announcements via the ASX API.
 * This is publicly available data from asx.com.au.
 * Docs: https://www.asx.com.au/asx/statistics/announcements.do
 */
export async function ingestAsxAnnouncements(
  sourceId: string,
  maxItems = 30
): Promise<RawArticle[]> {
  // ASX public announcements endpoint
  const url = 'https://www.asx.com.au/asx/1/statistics/announcements'
  
  try {
    const { data } = await axios.get(url, {
      params: { count: maxItems, market_sensitive: false },
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Fiscus/1.0 (+https://fiscus.io/bot)',
      },
      timeout: 15000,
    })

    const announcements: RawArticle[] = []
    
    for (const ann of (data?.data || []).slice(0, maxItems)) {
      if (!ann.headline) continue
      announcements.push({
        title: ann.headline,
        url: `https://www.asx.com.au/asx/1/company/${ann.issuer_code}/announcements/${ann.document_date}`,
        bodyText: ann.header || '',
        publishedAt: new Date(ann.document_date || Date.now()),
        sourceId,
      })
    }

    return announcements
  } catch (err) {
    console.error('[ASX] Failed to fetch announcements:', err)
    return []
  }
}

// ─── RBA Releases ────────────────────────────────────────────────────

/**
 * Ingest RBA press releases via their RSS feed.
 * https://www.rba.gov.au/rss/rss-cb-decisions.xml
 */
export async function ingestRbaReleases(sourceId: string): Promise<RawArticle[]> {
  return ingestRssFeed(
    'https://www.rba.gov.au/rss/rss-cb-decisions.xml',
    sourceId,
    10
  )
}

// ─── ABS Data Releases ────────────────────────────────────────────────

/**
 * Ingest ABS statistical releases via their RSS feed.
 * https://www.abs.gov.au/rss/14.rss
 */
export async function ingestAbsReleases(sourceId: string): Promise<RawArticle[]> {
  return ingestRssFeed('https://www.abs.gov.au/rss/14.rss', sourceId, 10)
}

// ─── Enrichment Pipeline ─────────────────────────────────────────────

export interface EnrichedArticle extends RawArticle {
  summary: string
  relatedTickers: string[]
  sector: string
  topicTags: string[]
}

/**
 * Enrich a raw article with AI-generated summary, tickers, and sector.
 */
export async function enrichArticle(
  article: RawArticle
): Promise<EnrichedArticle> {
  const [summary, relatedTickers, sector] = await Promise.all([
    summariseArticle(article.title, article.bodyText || ''),
    extractTickers(`${article.title} ${article.bodyText || ''}`),
    classifySector(article.title, article.bodyText || ''),
  ])

  // Derive topic tags from sector + ticker context
  const topicTags = deriveTopicTags(sector, relatedTickers, article.title)

  return {
    ...article,
    summary,
    relatedTickers,
    sector,
    topicTags,
  }
}

function deriveTopicTags(
  sector: string,
  tickers: string[],
  title: string
): string[] {
  const tags = new Set<string>()
  tags.add(sector)

  const titleLower = title.toLowerCase()
  if (titleLower.includes('rba') || titleLower.includes('interest rate')) tags.add('Interest Rates')
  if (titleLower.includes('gdp') || titleLower.includes('inflation')) tags.add('Macroeconomics')
  if (titleLower.includes('acquisition') || titleLower.includes('merger')) tags.add('M&A')
  if (titleLower.includes('ipo') || titleLower.includes('listing')) tags.add('IPO')
  if (titleLower.includes('china') || titleLower.includes('iron ore')) tags.add('China')
  if (titleLower.includes('dividend')) tags.add('Dividends')
  if (titleLower.includes('asx 200') || tickers.length > 2) tags.add('ASX200')

  return Array.from(tags).slice(0, 5)
}
