// Load .env file before anything else
import { existsSync, readFileSync } from 'node:fs'
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const m = line.match(/^([^#][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] ??= m[2].trim()
  }
}

/**
 * Local ingestion runner — use this to pull articles on demand.
 * Run with: npm run ingest
 *
 * Requires DATABASE_URL and ANTHROPIC_API_KEY in .env
 */
import { PrismaClient } from '@prisma/client'
import { ingestAllSources, enrichArticle } from './pipeline'
import { SOURCES } from './sources'

const db = new PrismaClient()

async function main() {
  console.log('\n🔄 Fiscus Ingestion Runner\n')

  // 1. Upsert sources
  console.log('Syncing sources...')
  for (const s of SOURCES) {
    await db.source.upsert({
      where: { id: s.id },
      update: { active: true },
      create: { id: s.id, name: s.name, url: s.url, type: s.type, credibility: s.credibility, rssUrl: s.rssUrl },
    })
  }

  // 2. Ingest from all sources
  console.log('Fetching articles from all sources...')
  const results = await ingestAllSources()
  let totalNew = 0

  for (const { sourceId, articles, error } of results) {
    if (error) { console.warn(`  ⚠ ${sourceId}: ${error}`); continue }

    for (const raw of articles) {
      const existing = await db.article.findUnique({ where: { url: raw.url } })
      if (existing) continue

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
        },
      })
      totalNew++
    }

    await db.source.update({ where: { id: sourceId }, data: { lastIngestedAt: new Date() } }).catch(() => {})
    if (articles.length > 0) console.log(`  ✓ ${sourceId}: ${articles.length} found, saved new`)
  }

  console.log(`\nIngested ${totalNew} new articles.`)

  // 3. Process unprocessed articles with AI
  const BATCH = parseInt(process.env.PROCESS_BATCH ?? '5')
  const pending = await db.article.findMany({
    where: { summary: null },
    take: BATCH,
    orderBy: { publishedAt: 'desc' },
    include: { source: { select: { name: true } } },
  })

  if (pending.length === 0) {
    console.log('No articles need AI processing.')
  } else {
    console.log(`\nAI-processing ${pending.length} articles...`)

    for (const article of pending) {
      try {
        const enriched = await enrichArticle({
          title: article.title,
          url: article.url,
          author: article.author ?? undefined,
          bodyText: article.bodyText ?? '',
          publishedAt: article.publishedAt,
          sourceId: article.sourceId,
        })

        await db.article.update({
          where: { id: article.id },
          data: {
            summary: enriched.summary,
            sector: enriched.sector,
            topicTags: enriched.topicTags,
            relatedTickers: enriched.relatedTickers,
          },
        })

        console.log(`  ✓ ${article.title.slice(0, 60)}...`)
      } catch (e) {
        console.error(`  ✗ ${article.title.slice(0, 60)}... — ${e}`)
      }
    }
  }

  console.log('\nDone.\n')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
