import { NextRequest, NextResponse } from 'next/server'
import { enrichArticle } from '@/lib/ingestion/pipeline'
import { generateVideoScript } from '@/lib/ai/scriptgen'
import { db, dbAvailable } from '@/lib/db'

export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}` || auth === secret
}

// Process N unprocessed articles per call (keeps within timeout)
const BATCH_SIZE = 3

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!dbAvailable) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL not configured' }, { status: 503 })
  }

  const startedAt = Date.now()

  // Find articles with no summary yet (unprocessed)
  const pending = await db.article.findMany({
    where: { summary: null },
    orderBy: { publishedAt: 'desc' },
    take: BATCH_SIZE,
    include: { source: { select: { name: true, credibility: true } } },
  })

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Nothing to process' })
  }

  // Sources that mix finance with general news — apply AI screen even if keywords pass
  const STRICT_SCREEN_SOURCES = new Set([
    'abc-business', 'smh-business', 'theage-business',
    'guardian-australia-business', 'reuters-business',
    'the-australian-business',
  ])

  const results: { id: string; title: string; status: 'ok' | 'skipped' | 'error'; error?: string; reason?: string }[] = []

  for (const article of pending) {
    try {
      const strictScreen = STRICT_SCREEN_SOURCES.has(article.sourceId)

      // ── AI enrichment (summary, tickers, sector) ──────────────────────────
      const enriched = await enrichArticle({
        title: article.title,
        url: article.url,
        author: article.author ?? undefined,
        bodyText: article.bodyText ?? '',
        publishedAt: article.publishedAt,
        sourceId: article.sourceId,
      }, strictScreen)

      // ── Reject off-topic articles — mark with a non-null sentinel summary ──
      if ('rejected' in enriched) {
        console.log(`[process] REJECTED (off-topic): ${article.title.slice(0, 60)} — ${enriched.reason}`)
        // Write a sentinel so this article is never re-queued
        await db.article.update({
          where: { id: article.id },
          data: { summary: '__REJECTED__', topicTags: ['__rejected__'], relatedTickers: [] },
        })
        results.push({ id: article.id, title: article.title, status: 'skipped', reason: enriched.reason })
        continue
      }

      // ── Generate video script ──────────────────────────────────────────────
      const primaryTicker = enriched.relatedTickers[0] ?? 'ASX'
      const scriptInput = {
        ticker: primaryTicker,
        company: enriched.relatedTickers.length > 0 ? primaryTicker : enriched.sector,
        headline: enriched.title,
        teaser: enriched.summary,
        sector: enriched.sector,
        category: enriched.topicTags[0] ?? 'Market Update',
        change: null,
        price: null,
        source: article.source.name,
      }

      let savedScriptId: string | undefined

      try {
        const script = await generateVideoScript(scriptInput)
        const savedScript = await db.videoScript.create({
          data: {
            hook: script.hook,
            coreUpdate: script.coreUpdate,
            whyItMatters: script.whyItMatters,
            sourceAttrib: script.sourceAttrib,
            fullScript: script.fullScript,
            wordCount: script.wordCount,
            modelVersion: 'claude-haiku-4-5-20251001',
          },
        })
        savedScriptId = savedScript.id
      } catch (scriptErr) {
        console.error(`[process] Script generation failed for ${article.id}:`, scriptErr)
        // Continue without script — article still gets summary
      }

      // ── Update article with enrichment data ────────────────────────────────
      await db.article.update({
        where: { id: article.id },
        data: {
          summary: enriched.summary,
          sector: enriched.sector,
          topicTags: enriched.topicTags,
          relatedTickers: enriched.relatedTickers,
          videoScriptId: savedScriptId ?? null,
        },
      })

      // ── Create Video record so the feed knows a briefing exists ───────────
      if (savedScriptId) {
        await db.video.upsert({
          where: { articleId: article.id },
          update: { status: 'COMPLETE', scriptId: savedScriptId },
          create: {
            articleId: article.id,
            scriptId: savedScriptId,
            title: article.title,
            status: 'COMPLETE',
            generatedAt: new Date(),
          },
        }).catch(() => {
          // Video may already exist — ignore conflict
        })
      }

      results.push({ id: article.id, title: article.title, status: 'ok' })
    } catch (err) {
      console.error(`[process] Failed to process article ${article.id}:`, err)
      results.push({ id: article.id, title: article.title, status: 'error', error: String(err) })
    }
  }

  const duration = Date.now() - startedAt
  console.log(`[process] Done in ${duration}ms — ${results.filter(r => r.status === 'ok').length}/${results.length} processed`)

  return NextResponse.json({ ok: true, duration, processed: results.length, results })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
