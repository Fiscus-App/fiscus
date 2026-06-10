import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const saves = await db.articleSave.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: 'desc' },
    take: 50,
    include: {
      article: {
        select: {
          id: true,
          title: true,
          url: true,
          publishedAt: true,
          sector: true,
          relatedTickers: true,
          summary: true,
          source: { select: { name: true, credibility: true } },
        },
      },
    },
  })

  return NextResponse.json(saves.map((s) => ({
    id: s.id,
    articleId: s.article.id,
    savedAt: s.savedAt,
    title: s.article.title,
    url: s.article.url,
    publishedAt: s.article.publishedAt,
    sector: s.article.sector,
    ticker: s.article.relatedTickers[0] ?? s.article.sector?.slice(0, 4).toUpperCase() ?? '—',
    summary: s.article.summary,
    source: s.article.source.name,
    sourceType: s.article.source.credibility,
  })))
}
