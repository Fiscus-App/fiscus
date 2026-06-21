import { SECTOR_COLORS } from '@/lib/ingestion/sources'
import type { FeedItem, SourceCredibility } from '@/types'

// Shape returned by the DB query in /api/feed
export interface DbArticle {
  id: string
  title: string
  url: string
  summary: string | null
  sector: string | null
  topicTags: string[]
  relatedTickers: string[]
  publishedAt: Date
  source: {
    name: string
    credibility: string
  }
  video: {
    id: string
    status: string
    videoUrl: string | null
    script: {
      fullScript: string
    } | null
  } | null
  // Real aggregate counts across all users (Prisma _count on the Article).
  _count?: {
    insightfulVotes: number
    saves: number
    shares: number
  }
  // Per-current-user state — non-empty arrays mean the user has acted.
  insightfulVotes?: { id: string }[]
  saves?: { id: string }[]
}

export function dbArticleToFeedItem(a: DbArticle): FeedItem {
  const ticker = a.relatedTickers[0] ?? 'ASX'
  const sector = a.sector ?? 'Macroeconomics'
  const sectorColor = SECTOR_COLORS[sector] ?? SECTOR_COLORS['default']
  const script = a.video?.script?.fullScript ?? a.summary ?? a.title
  const videoStatus =
    !a.video ? 'PENDING'
    : a.video.status === 'COMPLETE' ? 'COMPLETE'
    : a.video.status === 'FAILED' ? 'FAILED'
    : 'PENDING'

  return {
    id: a.id,
    ticker,
    company: companyFromTicker(ticker),
    sector,
    category: a.topicTags[0] ?? 'Market Update',
    sectorColor,
    headline: a.title,
    teaser: a.summary ?? a.title,
    script,
    source: a.source.name,
    sourceType: a.source.credibility as SourceCredibility,
    sourceUrl: `https://fiscus.io/article/${a.id}`, // link-through
    change: null,   // market price data wired separately
    price: null,
    tags: a.topicTags.length > 0 ? a.topicTags : [sector, ticker],
    publishedAt: relativeTime(a.publishedAt),
    insightfulCount: a._count?.insightfulVotes ?? 0,
    shareCount: a._count?.shares ?? 0,
    chartData: null,
    videoStatus: videoStatus as 'PENDING' | 'COMPLETE' | 'FAILED',
    videoUrl: a.video?.videoUrl ?? undefined,
    isInsightful: (a.insightfulVotes?.length ?? 0) > 0,
    isSaved: (a.saves?.length ?? 0) > 0,
  }
}

function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function companyFromTicker(ticker: string): string {
  const MAP: Record<string, string> = {
    CBA: 'Commonwealth Bank',
    WBC: 'Westpac Banking',
    ANZ: 'ANZ Group',
    NAB: 'National Australia Bank',
    MQG: 'Macquarie Group',
    BHP: 'BHP Group',
    RIO: 'Rio Tinto',
    FMG: 'Fortescue',
    WDS: 'Woodside Energy',
    STO: 'Santos',
    CSL: 'CSL Limited',
    WES: 'Wesfarmers',
    TLS: 'Telstra',
    ASX: 'ASX Limited',
    RBA: 'Reserve Bank of Australia',
    ABS: 'Australian Bureau of Statistics',
  }
  return MAP[ticker] ?? ticker
}
