import { PrismaClient } from '@prisma/client'
import { SOURCES } from '../src/lib/ingestion/sources'

const db = new PrismaClient()

async function main() {
  console.log('Seeding sources...')

  for (const s of SOURCES) {
    await db.source.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        type: s.type,
        credibility: s.credibility,
        rssUrl: s.rssUrl,
        active: true,
      },
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
    console.log(`  ✓ ${s.name}`)
  }

  console.log(`\nSeeded ${SOURCES.length} sources.`)
  console.log('\nNext steps:')
  console.log('  npm run ingest    — pull first batch of articles')
  console.log('  npm run db:studio — inspect the database')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
