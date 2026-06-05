import Parser from 'rss-parser'
import axios from 'axios'
import { summariseArticle, extractTickers, classifySector } from '../ai/summarise'
import { SOURCES, ASX_WATCHLIST, type SourceDefinition } from './sources'

const rssParser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Fiscus/1.0 (+https://fiscus.io/bot)' },
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawArticle {
  title: string
  url: string
  author?: string
  bodyText?: string
  publishedAt: Date
  sourceId: string
}

export interface EnrichedArticle extends RawArticle {
  summary: string
  relatedTickers: string[]
  sector: string
  topicTags: string[]
}

// ─── RSS Ingestion ────────────────────────────────────────────────────────────

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
      title: item.title.trim(),
      url: item.link.trim(),
      author: item.creator || item.author,
      bodyText: item.contentSnippet || item.content || item.summary || '',
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      sourceId,
    })
  }

  return articles
}

// ─── ASX Announcements ────────────────────────────────────────────────────────

export async function ingestAsxAnnouncements(sourceId: string): Promise<RawArticle[]> {
  const results: RawArticle[] = []

  // Fetch top market-sensitive announcements for watchlist
  const tickers = ASX_WATCHLIST.slice(0, 20) // limit per run to avoid timeout

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      try {
        const { data } = await axios.get(
          `https://www.asx.com.au/asx/1/company/${ticker}/announcements`,
          {
            params: { count: 3, market_sensitive: false },
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Fiscus/1.0 (+https://fiscus.io/bot)',
            },
            timeout: 8000,
          }
        )

        for (const ann of data?.data || []) {
          if (!ann.headline) continue
          results.push({
            title: `${ticker}: ${ann.headline}`,
            url: ann.url || `https://www.asx.com.au/asx/1/company/${ticker}/announcements`,
            bodyText: ann.header || ann.headline,
            publishedAt: new Date(ann.document_date || Date.now()),
            sourceId,
          })
        }
      } catch {
        // silently skip failed tickers
      }
    })
  )

  return results
}

// ─── RBA Releases ────────────────────────────────────────────────────────────

export async function ingestRbaReleases(sourceId: string): Promise<RawArticle[]> {
  const results: RawArticle[] = []
  const feeds = [
    'https://www.rba.gov.au/rss/rss-cb-media-releases.xml',
    'https://www.rba.gov.au/rss/rss-cb-decisions.xml',
    'https://www.rba.gov.au/rss/rss-cb-speeches.xml',
  ]
  for (const url of feeds) {
    try {
      const articles = await ingestRssFeed(url, sourceId, 5)
      results.push(...articles)
    } catch { /* skip */ }
  }
  return results
}

// ─── ABS Data Releases ────────────────────────────────────────────────────────

export async function ingestAbsReleases(sourceId: string): Promise<RawArticle[]> {
  return ingestRssFeed('https://www.abs.gov.au/rss/14.rss', sourceId, 10)
}

// ─── Full Source Sweep ────────────────────────────────────────────────────────
// Called by the cron endpoint to pull ALL sources in one pass.

export async function ingestAllSources(): Promise<{
  sourceId: string
  articles: RawArticle[]
  error?: string
}[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const articles = await ingestSource(source)
      return { sourceId: source.id, articles }
    })
  )

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { sourceId: SOURCES[i].id, articles: [], error: String(r.reason) }
  })
}

async function ingestSource(source: SourceDefinition): Promise<RawArticle[]> {
  if (source.type === 'OFFICIAL_API' && source.id === 'asx-announcements') {
    return ingestAsxAnnouncements(source.id)
  }
  if (source.rssUrl) {
    return ingestRssFeed(source.rssUrl, source.id, source.maxItems)
  }
  return []
}

// ─── AI Enrichment ───────────────────────────────────────────────────────────

export async function enrichArticle(article: RawArticle): Promise<EnrichedArticle> {
  const text = `${article.title} ${article.bodyText || ''}`

  const [summary, relatedTickers, sector] = await Promise.all([
    summariseArticle(article.title, article.bodyText || ''),
    extractTickers(text),
    classifySector(article.title, article.bodyText || ''),
  ])

  return {
    ...article,
    summary,
    relatedTickers,
    sector,
    topicTags: deriveTopicTags(sector, relatedTickers, article.title),
  }
}

function deriveTopicTags(sector: string, tickers: string[], title: string): string[] {
  const tags = new Set<string>([sector])
  const t = title.toLowerCase()

  if (t.includes('rba') || t.includes('interest rate') || t.includes('cash rate')) tags.add('Interest Rates')
  if (t.includes('gdp') || t.includes('inflation') || t.includes('cpi')) tags.add('Macroeconomics')
  if (t.includes('acquisition') || t.includes('merger') || t.includes('takeover')) tags.add('M&A')
  if (t.includes('ipo') || t.includes('listing') || t.includes('float')) tags.add('IPO')
  if (t.includes('china') || t.includes('iron ore')) tags.add('China')
  if (t.includes('dividend') || t.includes('distribution')) tags.add('Dividends')
  if (t.includes('asx 200') || t.includes('asx200') || tickers.length > 2) tags.add('ASX200')
  if (t.includes('earnings') || t.includes('profit') || t.includes('revenue')) tags.add('Earnings')
  if (t.includes('gold') || t.includes('copper') || t.includes('lithium')) tags.add('Commodities')
  if (t.includes('federal reserve') || t.includes('fed ') || t.includes('us economy')) tags.add('Global')

  tickers.slice(0, 3).forEach((tk) => tags.add(tk))

  return Array.from(tags).slice(0, 6)
}
