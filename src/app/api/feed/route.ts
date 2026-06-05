import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '10')
  const sector = searchParams.get('sector')
  const search = searchParams.get('search')

  try {
    const where: Record<string, unknown> = {}

    if (sector) {
      where.sector = sector
    }

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

    return NextResponse.json({
      data: articles,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    })
  } catch (err) {
    console.error('[API/feed] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
