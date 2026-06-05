import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'
import { dbArticleToFeedItem } from '@/lib/feed/transform'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') ?? '20'))
  const sector   = searchParams.get('sector')
  const search   = searchParams.get('search')

  // ── No DB → return empty (feed page uses mock fallback) ─────────────────
  if (!dbAvailable) {
    return NextResponse.json({ data: [], total: 0, page, pageSize, hasMore: false, source: 'mock' })
  }

  try {
    const where: Record<string, unknown> = {
      summary: { not: null }, // only show AI-processed articles
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
              _count: { select: { insightfulVotes: true } },
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.article.count({ where }),
    ])

    const feedItems = articles.map(dbArticleToFeedItem)

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
