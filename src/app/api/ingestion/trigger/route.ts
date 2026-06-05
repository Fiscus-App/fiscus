import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ingestRssFeed,
  ingestAsxAnnouncements,
  ingestRbaReleases,
  ingestAbsReleases,
  enrichArticle,
  type RawArticle,
} from '@/lib/ingestion/pipeline'

export async function POST(req: NextRequest) {
  const { sourceId } = await req.json()

  if (!sourceId) {
    return NextResponse.json({ error: 'sourceId is required' }, { status: 400 })
  }

  const source = await db.source.findUnique({ where: { id: sourceId } })
  if (!source || !source.active) {
    return NextResponse.json({ error: 'Source not found or inactive' }, { status: 404 })
  }

  // Create an ingestion job record
  const job = await db.ingestionJob.create({
    data: { sourceId, status: 'PROCESSING', startedAt: new Date() },
  })

  // Run ingestion asynchronously (fire-and-forget in edge runtime)
  // In production, delegate to a background worker queue (BullMQ, Inngest, etc.)
  runIngestion(source, job.id).catch((err) => {
    console.error(`[Ingestion] Job ${job.id} failed:`, err)
  })

  return NextResponse.json({ jobId: job.id, status: 'PROCESSING' })
}

async function runIngestion(
  source: { id: string; type: string; rssUrl: string | null },
  jobId: string
) {
  let rawArticles: RawArticle[] | undefined

  switch (source.type) {
    case 'OFFICIAL_API':
      if (source.id.includes('asx')) {
        rawArticles = await ingestAsxAnnouncements(source.id)
      } else if (source.id.includes('rba')) {
        rawArticles = await ingestRbaReleases(source.id)
      } else if (source.id.includes('abs')) {
        rawArticles = await ingestAbsReleases(source.id)
      }
      break
    case 'RSS_FEED':
    case 'LICENSED_FEED':
      if (source.rssUrl) {
        rawArticles = await ingestRssFeed(source.rssUrl, source.id)
      }
      break
    default:
      rawArticles = []
  }

  if (!rawArticles?.length) {
    await db.ingestionJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETE', completedAt: new Date() },
    })
    return
  }

  let ingested = 0

  for (const raw of rawArticles) {
    try {
      // Skip if already ingested
      const existing = await db.article.findUnique({ where: { url: raw.url } })
      if (existing) continue

      const enriched = await enrichArticle(raw)

      await db.article.create({
        data: {
          sourceId: raw.sourceId,
          title: enriched.title,
          url: enriched.url,
          author: enriched.author,
          bodyText: enriched.bodyText,
          publishedAt: enriched.publishedAt,
          sector: enriched.sector,
          topicTags: enriched.topicTags,
          relatedTickers: enriched.relatedTickers,
          summary: enriched.summary,
        },
      })

      ingested++
    } catch (err) {
      console.error(`[Ingestion] Failed to save article: ${raw.url}`, err)
    }
  }

  await db.ingestionJob.update({
    where: { id: jobId },
    data: { status: 'COMPLETE', completedAt: new Date() },
  })

  await db.source.update({
    where: { id: source.id },
    data: {
      lastIngestedAt: new Date(),
      articlesCount: { increment: ingested },
    },
  })
}
