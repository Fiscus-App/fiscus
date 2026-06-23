import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'
import { generateComposition } from '@/lib/ai/scenegen'
import type { CompositionInput, VideoComposition } from '@/types'

/**
 * Build (or fetch) the ONE canonical video composition for an article.
 *
 * Locking behaviour: the first time an article's video is composed we store
 * the composition on its Video row and ALWAYS return that same one afterwards
 * — identical scenes + captions on every play, for every user. It is only
 * rebuilt when the backend explicitly asks via `{ regenerate: true }`.
 *
 * DB-optional and push-optional: the composition column is read/written with
 * raw SQL, so it needs no Prisma client regeneration. Before `npm run db:push`
 * adds the column, persistence simply no-ops and the route keeps generating
 * fresh — no errors, no broken feed.
 */

// Process-lifetime flag: once we learn the column isn't there yet (pre-push),
// stop probing/persisting so we don't create rows or throw on every request.
let compositionColumnReady = true

function isMissingColumn(err: unknown): boolean {
  const s = String(
    (err as { meta?: { message?: string } })?.meta?.message ?? (err as Error)?.message ?? err,
  )
  return /column .*composition.* does not exist/i.test(s) || /42703/.test(s)
}

function asComposition(raw: unknown): VideoComposition | null {
  const obj = typeof raw === 'string' ? safeParse(raw) : raw
  if (obj && typeof obj === 'object' && Array.isArray((obj as VideoComposition).scenes)) {
    const comp = obj as VideoComposition
    if (comp.scenes.length >= 2) return comp
  }
  return null
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s) } catch { return null }
}

export async function POST(req: NextRequest) {
  let body: Partial<CompositionInput> & { articleId?: string; regenerate?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.headline && !body.articleId) {
    return NextResponse.json({ error: 'headline or articleId is required' }, { status: 400 })
  }

  const regenerate = body.regenerate === true

  // Start from what the client posted.
  const input: CompositionInput = {
    articleId: body.articleId,
    ticker: body.ticker ?? 'ASX',
    company: body.company ?? body.ticker ?? 'Market',
    headline: body.headline ?? '',
    summary: body.summary ?? body.headline ?? '',
    bodyText: body.bodyText,
    sector: body.sector ?? 'Macroeconomics',
    sectorColor: body.sectorColor ?? '#5b8af5',
    category: body.category ?? 'Market Update',
    source: body.source ?? 'Fiscus',
    change: body.change ?? null,
    price: body.price ?? null,
    series: body.series ?? null,
  }

  // Confirm the article exists (so we only persist against real rows) and
  // enrich the input with the full article body for a richer summary.
  let articleExists = false
  if (body.articleId && dbAvailable) {
    try {
      const article = await db.article.findUnique({
        where: { id: body.articleId },
        include: { source: { select: { name: true } } },
      })
      if (article) {
        articleExists = true
        input.headline = input.headline || article.title
        input.summary = article.summary ?? input.summary
        input.bodyText = article.bodyText ?? input.bodyText
        input.source = article.source?.name ?? input.source
        if (article.sector) input.sector = article.sector
        if (article.relatedTickers[0]) input.ticker = article.relatedTickers[0]
      }
    } catch {
      /* enrichment is best-effort; fall back to posted fields */
    }
  }

  // ── Cache hit: return the locked composition unless told to regenerate ──
  if (articleExists && !regenerate && compositionColumnReady) {
    try {
      const rows = await db.$queryRaw<{ composition: unknown }[]>`
        SELECT "composition" FROM "Video"
        WHERE "articleId" = ${body.articleId} AND "composition" IS NOT NULL
        LIMIT 1`
      const cached = asComposition(rows[0]?.composition)
      if (cached) return NextResponse.json({ composition: cached, cached: true })
    } catch (err) {
      if (isMissingColumn(err)) compositionColumnReady = false
      /* otherwise fall through and generate */
    }
  }

  // ── Generate fresh ─────────────────────────────────────────────────────
  let composition: VideoComposition
  try {
    composition = await generateComposition(input)
  } catch {
    return NextResponse.json({ error: 'Composition failed' }, { status: 500 })
  }

  // ── Lock it to the article's canonical Video row (best-effort) ─────────
  if (articleExists && compositionColumnReady) {
    try {
      const video = await db.video.upsert({
        where: { articleId: body.articleId! },
        update: { status: 'COMPLETE', generatedAt: new Date() },
        create: {
          articleId: body.articleId!,
          title: (input.headline || 'Untitled').slice(0, 300),
          status: 'COMPLETE',
          generatedAt: new Date(),
        },
      })
      await db.$executeRaw`
        UPDATE "Video" SET "composition" = ${JSON.stringify(composition)}::jsonb
        WHERE "id" = ${video.id}`
    } catch (err) {
      if (isMissingColumn(err)) compositionColumnReady = false
      /* persistence is best-effort — still return the composition below */
    }
  }

  return NextResponse.json({ composition, cached: false })
}
