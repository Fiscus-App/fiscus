import { NextRequest, NextResponse } from 'next/server'
import { ingestAllSources } from '@/lib/ingestion/pipeline'
import { db, dbAvailable } from '@/lib/db'
import { SOURCES } from '@/lib/ingestion/sources'

// Allow up to 60 seconds on Pro, 10s on Hobby
export const maxDuration = 60

// Simple bearer-token guard so only our scheduler can trigger this
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // open if no secret configured (dev)
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}` || auth === secret
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!dbAvailable) {
    return NextResponse.json({
      ok: false,
      message: 'DATABASE_URL not configured. Set it in Vercel environment variables.',
    }, { status: 503 })
  }

  const startedAt = Date.now()

  // ── 1. Upsert all sources so FK constraints are satisfied ────────────────
  await Promise.allSettled(
    SOURCES.map((s) =>
      db.source.upsert({
        where: { id: s.id },
        update: { active: true },
        create: {
          id: s.id,
          name: s.name,
          url: s.url,
          type: s.type,
          credibility: s.credibility,
          rssUrl: s.rssUrl,
          active: true,
        },
      })
    )
  )

  // ── 2. Pull articles from every source in parallel ────────────────────────
  const sweepResults = await ingestAllSources()

  let totalNew = 0
  let totalSeen = 0
  const sourceStats: Record<string, { new: number; seen: number; error?: string }> = {}

  for (const { sourceId, articles, error } of sweepResults) {
    sourceStats[sourceId] = { new: 0, seen: 0, error }

    for (const raw of articles) {
      try {
        // Skip if URL already in DB
        const existing = await db.article.findUnique({ where: { url: raw.url } })
        if (existing) {
          totalSeen++
          sourceStats[sourceId].seen++
          continue
        }

        // Save raw article (AI enrichment happens in /api/cron/process)
        await db.article.create({
          data: {
            sourceId: raw.sourceId,
            title: raw.title,
            url: raw.url,
            author: raw.author,
            bodyText: raw.bodyText,
            publishedAt: raw.publishedAt,
            topicTags: [],
            relatedTickers: [],
            // summary left null — set by processor
          },
        })

        totalNew++
        sourceStats[sourceId].new++
      } catch (err) {
        console.error(`[ingest] Failed to save article: ${raw.url}`, err)
      }
    }

    // Update lastIngestedAt
    if (!error) {
      await db.source.update({
        where: { id: sourceId },
        data: { lastIngestedAt: new Date() },
      }).catch(() => {})
    }
  }

  const duration = Date.now() - startedAt

  console.log(`[ingest] Done in ${duration}ms — ${totalNew} new, ${totalSeen} seen`)

  return NextResponse.json({
    ok: true,
    duration,
    totalNew,
    totalSeen,
    sources: sourceStats,
  })
}

// Allow Vercel cron (GET) and manual POST
export async function GET(req: NextRequest) {
  return POST(req)
}
