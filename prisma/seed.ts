import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Fiscus database...')

  // ── Demo user ────────────────────────────────────────────────────
  const user = await db.user.upsert({
    where: { email: 'demo@fiscus.io' },
    update: {},
    create: {
      email: 'demo@fiscus.io',
      name: 'Demo Analyst',
      passwordHash: await bcrypt.hash('fiscus2025', 12),
      role: 'ADMIN',
      tier: 'PRO',
    },
  })
  console.log('✓ Demo user created:', user.email)

  // ── User interests ───────────────────────────────────────────────
  const interests = ['ASX 200', 'Banking', 'Mining', 'Energy', 'Interest Rates', 'Macroeconomics']
  for (const interest of interests) {
    await db.userInterest.upsert({
      where: { userId_interest: { userId: user.id, interest } },
      update: {},
      create: { userId: user.id, interest },
    })
  }
  console.log('✓ Interests seeded')

  // ── Sources ──────────────────────────────────────────────────────
  const sources = [
    {
      name: 'ASX Announcements',
      url: 'https://www.asx.com.au',
      type: 'OFFICIAL_API' as const,
      credibility: 'OFFICIAL' as const,
      rssUrl: null,
      apiEndpoint: 'https://www.asx.com.au/asx/1/statistics/announcements',
    },
    {
      name: 'Reserve Bank of Australia',
      url: 'https://www.rba.gov.au',
      type: 'RSS_FEED' as const,
      credibility: 'OFFICIAL' as const,
      rssUrl: 'https://www.rba.gov.au/rss/rss-cb-decisions.xml',
    },
    {
      name: 'Australian Bureau of Statistics',
      url: 'https://www.abs.gov.au',
      type: 'OFFICIAL_API' as const,
      credibility: 'OFFICIAL' as const,
      rssUrl: 'https://www.abs.gov.au/rss/14.rss',
    },
    {
      name: 'Australian Financial Review',
      url: 'https://www.afr.com',
      type: 'LICENSED_FEED' as const,
      credibility: 'TIER_1_MEDIA' as const,
      rssUrl: 'https://www.afr.com/rss/feed', // Replace with licensed feed URL
    },
    {
      name: 'Bloomberg Markets',
      url: 'https://www.bloomberg.com',
      type: 'LICENSED_FEED' as const,
      credibility: 'TIER_1_MEDIA' as const,
      rssUrl: null, // Requires Bloomberg B-PIPE license
    },
    {
      name: 'Reuters Australia',
      url: 'https://www.reuters.com',
      type: 'LICENSED_FEED' as const,
      credibility: 'TIER_1_MEDIA' as const,
      rssUrl: 'https://feeds.reuters.com/reuters/businessNews',
    },
    {
      name: 'Morningstar Australia',
      url: 'https://www.morningstar.com.au',
      type: 'LICENSED_FEED' as const,
      credibility: 'TIER_1_MEDIA' as const,
      rssUrl: null,
    },
    {
      name: 'Yahoo Finance ASX',
      url: 'https://finance.yahoo.com',
      type: 'WEB_SCRAPER' as const,
      credibility: 'MARKET_DATA' as const,
      rssUrl: null,
    },
  ]

  for (const source of sources) {
    await db.source.upsert({
      where: { url: source.url },
      update: {},
      create: source,
    })
  }
  console.log('✓ Sources seeded:', sources.length)

  // ── Demo team ────────────────────────────────────────────────────
  const team = await db.team.upsert({
    where: { slug: 'team-strategy' },
    update: {},
    create: {
      name: 'Team Strategy',
      slug: 'team-strategy',
      description: 'Resources & Banking sector coverage',
    },
  })

  await db.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: {},
    create: { teamId: team.id, userId: user.id, role: 'OWNER' },
  })
  console.log('✓ Team seeded:', team.name)

  // ── ASX tickers ──────────────────────────────────────────────────
  const tickers = [
    { symbol: 'BHP', name: 'BHP Group Limited', sector: 'Mining', exchange: 'ASX' },
    { symbol: 'CBA', name: 'Commonwealth Bank of Australia', sector: 'Banking', exchange: 'ASX' },
    { symbol: 'RIO', name: 'Rio Tinto Limited', sector: 'Mining', exchange: 'ASX' },
    { symbol: 'WDS', name: 'Woodside Energy Group', sector: 'Energy', exchange: 'ASX' },
    { symbol: 'ANZ', name: 'ANZ Banking Group', sector: 'Banking', exchange: 'ASX' },
    { symbol: 'NAB', name: 'National Australia Bank', sector: 'Banking', exchange: 'ASX' },
    { symbol: 'WBC', name: 'Westpac Banking Corporation', sector: 'Banking', exchange: 'ASX' },
    { symbol: 'FMG', name: 'Fortescue Ltd', sector: 'Mining', exchange: 'ASX' },
    { symbol: 'MQG', name: 'Macquarie Group', sector: 'Banking', exchange: 'ASX' },
    { symbol: 'CSL', name: 'CSL Limited', sector: 'Healthcare', exchange: 'ASX' },
    { symbol: 'WES', name: 'Wesfarmers Limited', sector: 'Retail', exchange: 'ASX' },
    { symbol: 'TLS', name: 'Telstra Group', sector: 'Technology', exchange: 'ASX' },
  ]

  for (const ticker of tickers) {
    await db.ticker.upsert({
      where: { symbol: ticker.symbol },
      update: {},
      create: ticker,
    })
  }
  console.log('✓ Tickers seeded:', tickers.length)

  console.log('\n✅ Seed complete!')
  console.log('   Demo login: demo@fiscus.io / fiscus2025')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
