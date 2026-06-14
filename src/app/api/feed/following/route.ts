import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { dbArticleToFeedItem } from '@/lib/feed/transform'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ data: [], source: 'empty' })

  if (!dbAvailable) return NextResponse.json({ data: [], source: 'no-db' })

  try {
    // Get user's follows
    const follows = await db.userFollow.findMany({
      where: { userId: session.user.id },
    })

    if (follows.length === 0) {
      return NextResponse.json({ data: [], source: 'empty', empty: true })
    }

    const tickers  = follows.filter(f => f.type === 'STOCK'  || f.type === 'INDEX').map(f => f.value)
    const sectors  = follows.filter(f => f.type === 'SECTOR').map(f => f.value)
    const sources  = follows.filter(f => f.type === 'SOURCE').map(f => f.label)

    // Build OR filter
    const orFilters: object[] = []
    if (tickers.length)  orFilters.push({ relatedTickers: { hasSome: tickers } })
    if (sectors.length)  orFilters.push({ sector: { in: sectors } })
    if (sources.length)  orFilters.push({ source: { name: { in: sources } } })

    if (orFilters.length === 0) {
      return NextResponse.json({ data: [], source: 'empty', empty: true })
    }

    const articles = await db.article.findMany({
      where: {
        summary: { not: null },
        OR: orFilters,
      },
      include: {
        source: { select: { name: true, credibility: true } },
        video: { select: { id: true, status: true, videoUrl: true, thumbnailUrl: true } },
        insightfulVotes: { where: { userId: session.user.id }, select: { id: true } },
        saves: { where: { userId: session.user.id }, select: { id: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 30,
    })

    const data = articles.map(dbArticleToFeedItem)
    return NextResponse.json({ data, source: 'live', total: data.length })
  } catch {
    return NextResponse.json({ data: [], source: 'error' })
  }
}
