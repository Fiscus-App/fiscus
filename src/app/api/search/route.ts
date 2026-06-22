import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'
import { searchAssets, BROWSE_CATEGORIES } from '@/lib/market/search'
import { getAsset } from '@/lib/market/universe'

export const dynamic = 'force-dynamic'

interface StockResult {
  ticker: string
  name: string
  exchange: string
  type: string
  sector: string
  sectorColor: string
}

interface BrowseItem {
  id: string
  label: string
  icon: string
  stocks: StockResult[]
}

function toResult(a: { ticker: string; name: string; exchange: string; type: string; sector: string; sectorColor: string }): StockResult {
  return { ticker: a.ticker, name: a.name, exchange: a.exchange, type: a.type, sector: a.sector, sectorColor: a.sectorColor }
}

// Browse categories for the empty state — resolved to real universe assets.
function buildBrowse(): BrowseItem[] {
  return BROWSE_CATEGORIES.map(c => ({
    id: c.id,
    label: c.label,
    icon: c.icon,
    stocks: c.tickers
      .map(t => getAsset(t))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map(toResult),
  })).filter(c => c.stocks.length > 0)
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()

  if (!q) {
    return NextResponse.json({ stocks: [], articles: [], browse: buildBrowse() })
  }

  // ── Asset search (ranked over the full universe) ───────────────────────────
  const stocks = searchAssets(q, 10).map(toResult)

  // ── Article search (DB, best-effort) ───────────────────────────────────────
  let articles: {
    id: string
    title: string
    summary: string | null
    sector: string | null
    relatedTickers: string[]
    publishedAt: Date
    source: { name: string }
  }[] = []

  if (dbAvailable) {
    try {
      const upper = q.toUpperCase()
      const lower = q.toLowerCase()
      articles = await db.article.findMany({
        where: {
          summary: { not: null, notIn: ['__REJECTED__'] },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { relatedTickers: { has: upper } },
            { topicTags: { has: lower } },
            { sector: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, title: true, summary: true, sector: true,
          relatedTickers: true, publishedAt: true,
          source: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      })
    } catch {
      /* DB unavailable → assets still return */
    }
  }

  return NextResponse.json({ stocks, articles, browse: null })
}
