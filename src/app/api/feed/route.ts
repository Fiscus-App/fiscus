import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { dbArticleToFeedItem } from '@/lib/feed/transform'
import { fetchStooqQuotesByTicker } from '@/lib/market/stooq'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
  const sector   = searchParams.get('sector')
  const search   = searchParams.get('search')

  // Who's asking — lets us return their own saved/insightful state.
  const session = await getServerSession(authOptions)
  const userId  = session?.user?.id ?? '___nouser___'

  // ── No DB → return empty (feed page uses mock fallback) ─────────────────
  if (!dbAvailable) {
    return NextResponse.json({ data: [], total: 0, page, pageSize, hasMore: false, source: 'mock' })
  }

  try {
    const where: Record<string, unknown> = {
      // Only show AI-processed articles; exclude off-topic rejections
      summary: { not: null, notIn: ['__REJECTED__'] },
    }

    if (sector) where.sector = sector

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { relatedTickers: { has: search.toUpperCase() } },
      ]
    }

    const [articles, total] = await Promise.all([
      db.article.findMany({
        where,
        include: {
          source: { select: { name: true, credibility: true } },
          video: {
            select: {
              id: true,
              status: true,
              videoUrl: true,
              script: { select: { fullScript: true } },
            },
          },
          _count: { select: { insightfulVotes: true, saves: true, shares: true } },
          insightfulVotes: { where: { userId }, select: { id: true } },
          saves: { where: { userId }, select: { id: true } },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.article.count({ where }),
    ])

    // Real prices for the PRIMARY ticker shown on each card, from Stooq (free,
    // no key, no credit limit). Only fetch what's actually displayed — not every
    // ticker mentioned — which also keeps Stooq request volume low.
    const primaryTickers = Array.from(new Set(
      articles.map((a) => a.relatedTickers[0]).filter((t): t is string => !!t)
    ))
    const quotes = await fetchStooqQuotesByTicker(primaryTickers)

    const feedItems = articles.map((a) => {
      const item   = dbArticleToFeedItem(a)
      const ticker = a.relatedTickers[0]
      const quote  = ticker ? quotes.get(ticker.toUpperCase()) : undefined
      if (quote) {
        item.price  = quote.price
        item.change = quote.change
      }
      return item
    })

    return NextResponse.json({
      data: feedItems,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      source: 'live',
    })
  } catch (err) {
    console.error('[API/feed]', err)
    return NextResponse.json(
      { data: [], total: 0, page, pageSize, hasMore: false, source: 'error', error: String(err) },
      { status: 500 }
    )
  }
}
