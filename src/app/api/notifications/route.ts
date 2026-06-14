import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// Returns a unified notifications payload:
//   breaking  — 8 most recent articles (last 24h), sorted by publishedAt
//   saves     — user's 10 most recent saves
//   followAlerts — articles matching follows, published since lastSeen
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ breaking: [], saves: [], followAlerts: [] })

  if (!dbAvailable) return NextResponse.json({ breaking: [], saves: [], followAlerts: [], source: 'no-db' })

  const userId = session.user.id
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  try {
    const [breaking, saves, follows] = await Promise.all([
      // Breaking: recent high-value articles (last 24h, max 8)
      db.article.findMany({
        where: {
          publishedAt: { gte: since24h },
          summary: { not: null, notIn: ['__REJECTED__'] },
        },
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          summary: true,
          sector: true,
          relatedTickers: true,
          publishedAt: true,
          source: { select: { name: true } },
        },
      }),

      // Saves: user's last 10
      db.articleSave.findMany({
        where: { userId },
        orderBy: { savedAt: 'desc' },
        take: 10,
        include: {
          article: {
            select: {
              id: true,
              title: true,
              summary: true,
              sector: true,
              relatedTickers: true,
              publishedAt: true,
              source: { select: { name: true } },
            },
          },
        },
      }),

      // User's follows for alert matching
      db.userFollow.findMany({ where: { userId } }),
    ])

    // Follow alerts: articles since 6h ago matching followed tickers/sectors
    const since6h = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const tickers  = follows.filter(f => f.type === 'STOCK' || f.type === 'INDEX').map(f => f.value)
    const sectors  = follows.filter(f => f.type === 'SECTOR').map(f => f.value)

    let followAlerts: typeof breaking = []
    if (tickers.length > 0 || sectors.length > 0) {
      const orFilters: object[] = []
      if (tickers.length) orFilters.push({ relatedTickers: { hasSome: tickers } })
      if (sectors.length) orFilters.push({ sector: { in: sectors } })

      followAlerts = await db.article.findMany({
        where: {
          publishedAt: { gte: since6h },
          summary: { not: null, notIn: ['__REJECTED__'] },
          OR: orFilters,
        },
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          summary: true,
          sector: true,
          relatedTickers: true,
          publishedAt: true,
          source: { select: { name: true } },
        },
      })
    }

    return NextResponse.json({
      source: 'live',
      breaking: breaking.map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        sector: a.sector,
        ticker: a.relatedTickers[0] ?? a.sector?.slice(0,3).toUpperCase() ?? 'ASX',
        publishedAt: a.publishedAt,
        source: a.source.name,
      })),
      saves: saves.map(s => ({
        id: s.article.id,
        title: s.article.title,
        summary: s.article.summary,
        sector: s.article.sector,
        ticker: s.article.relatedTickers[0] ?? s.article.sector?.slice(0,3).toUpperCase() ?? 'ASX',
        publishedAt: s.article.publishedAt,
        savedAt: s.savedAt,
        source: s.article.source.name,
      })),
      followAlerts: followAlerts.map(a => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        sector: a.sector,
        ticker: a.relatedTickers[0] ?? a.sector?.slice(0,3).toUpperCase() ?? 'ASX',
        publishedAt: a.publishedAt,
        source: a.source.name,
      })),
    })
  } catch {
    return NextResponse.json({ breaking: [], saves: [], followAlerts: [], source: 'error' })
  }
}
