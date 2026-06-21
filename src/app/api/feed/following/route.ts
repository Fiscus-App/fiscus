import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { dbArticleToFeedItem } from '@/lib/feed/transform'

interface FollowLike { type: string; value: string; label?: string }

// Shared matcher: returns feed items for a set of follows, with real aggregate
// counts and the given user's own saved/insightful state.
async function buildFollowingFeed(userId: string, follows: FollowLike[]) {
  const tickers = follows.filter((f) => f.type === 'STOCK' || f.type === 'INDEX').map((f) => f.value)
  const sectors = follows.filter((f) => f.type === 'SECTOR').map((f) => f.value)
  const sources = follows.filter((f) => f.type === 'SOURCE').map((f) => f.label ?? f.value)

  const orFilters: object[] = []
  if (tickers.length) orFilters.push({ relatedTickers: { hasSome: tickers } })
  if (sectors.length) orFilters.push({ sector: { in: sectors } })
  if (sources.length) orFilters.push({ source: { name: { in: sources } } })
  if (orFilters.length === 0) return []

  const articles = await db.article.findMany({
    where: { summary: { not: null, notIn: ['__REJECTED__'] }, OR: orFilters },
    include: {
      source: { select: { name: true, credibility: true } },
      video: { select: { id: true, status: true, videoUrl: true, script: { select: { fullScript: true } } } },
      _count: { select: { insightfulVotes: true, saves: true, shares: true } },
      insightfulVotes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 30,
  })

  return articles.map(dbArticleToFeedItem)
}

// GET — match against the follows stored in the DB.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ data: [], source: 'empty' })
  if (!dbAvailable) return NextResponse.json({ data: [], source: 'no-db' })

  try {
    const follows = await db.userFollow.findMany({ where: { userId: session.user.id } })
    if (follows.length === 0) return NextResponse.json({ data: [], source: 'empty', empty: true })
    const data = await buildFollowingFeed(session.user.id, follows)
    return NextResponse.json({ data, source: 'live', total: data.length })
  } catch {
    return NextResponse.json({ data: [], source: 'error' })
  }
}

// POST — match against follows sent by the client (localStorage source of
// truth), so the feed reflects exactly what the user follows right now even if
// the background DB sync hasn't caught up yet.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ data: [], source: 'empty' })
  if (!dbAvailable) return NextResponse.json({ data: [], source: 'no-db' })

  try {
    const body = await req.json().catch(() => ({}))
    const follows: FollowLike[] = Array.isArray(body?.follows) ? body.follows : []
    if (follows.length === 0) return NextResponse.json({ data: [], source: 'empty', empty: true })
    const data = await buildFollowingFeed(session.user.id, follows)
    return NextResponse.json({ data, source: 'live', total: data.length })
  } catch {
    return NextResponse.json({ data: [], source: 'error' })
  }
}
