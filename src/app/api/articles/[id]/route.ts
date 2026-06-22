import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!dbAvailable) {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  }

  try {
    const a = await db.article.findUnique({
      where: { id: params.id },
      select: {
        id: true, title: true, summary: true, bodyText: true, url: true,
        author: true, publishedAt: true, sector: true, relatedTickers: true,
        source: { select: { name: true, url: true } },
      },
    })

    if (!a || a.summary === '__REJECTED__') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    let related: { id: string; title: string; publishedAt: Date; source: { name: string } }[] = []
    try {
      related = await db.article.findMany({
        where: {
          id: { not: a.id },
          summary: { not: null, notIn: ['__REJECTED__'] },
          OR: [
            ...(a.sector ? [{ sector: a.sector }] : []),
            ...(a.relatedTickers.length ? [{ relatedTickers: { hasSome: a.relatedTickers } }] : []),
          ],
        },
        select: { id: true, title: true, publishedAt: true, source: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 4,
      })
    } catch { /* related is best-effort */ }

    return NextResponse.json({
      article: {
        id: a.id,
        title: a.title,
        summary: a.summary,
        bodyText: a.bodyText,
        url: a.url,
        author: a.author,
        publishedAt: a.publishedAt,
        sector: a.sector,
        relatedTickers: a.relatedTickers,
        source: a.source.name,
        sourceUrl: a.source.url,
      },
      related: related.map(r => ({
        id: r.id, title: r.title, publishedAt: r.publishedAt, source: r.source.name,
      })),
    }, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' } })
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 })
  }
}
