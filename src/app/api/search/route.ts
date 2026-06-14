import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'

// Curated ASX stock universe for instant search
const ASX_STOCKS = [
  { ticker: 'CBA',  name: 'Commonwealth Bank',        sector: 'Banking',       sectorColor: '#5b8af5' },
  { ticker: 'BHP',  name: 'BHP Group',                sector: 'Mining',        sectorColor: '#2ed494' },
  { ticker: 'CSL',  name: 'CSL Limited',              sector: 'Healthcare',    sectorColor: '#a78bfa' },
  { ticker: 'NAB',  name: 'National Australia Bank',  sector: 'Banking',       sectorColor: '#5b8af5' },
  { ticker: 'WBC',  name: 'Westpac Banking',          sector: 'Banking',       sectorColor: '#5b8af5' },
  { ticker: 'ANZ',  name: 'ANZ Group',                sector: 'Banking',       sectorColor: '#5b8af5' },
  { ticker: 'MQG',  name: 'Macquarie Group',          sector: 'Finance',       sectorColor: '#e8b84b' },
  { ticker: 'WDS',  name: 'Woodside Energy',          sector: 'Energy',        sectorColor: '#f97316' },
  { ticker: 'RIO',  name: 'Rio Tinto',                sector: 'Mining',        sectorColor: '#2ed494' },
  { ticker: 'FMG',  name: 'Fortescue',                sector: 'Mining',        sectorColor: '#2ed494' },
  { ticker: 'WOW',  name: 'Woolworths Group',         sector: 'Consumer',      sectorColor: '#22d48a' },
  { ticker: 'WES',  name: 'Wesfarmers',               sector: 'Retail',        sectorColor: '#22d48a' },
  { ticker: 'TLS',  name: 'Telstra',                  sector: 'Telecom',       sectorColor: '#5b8af5' },
  { ticker: 'GMG',  name: 'Goodman Group',            sector: 'Property',      sectorColor: '#a78bfa' },
  { ticker: 'TCL',  name: 'Transurban',               sector: 'Infrastructure',sectorColor: '#f97316' },
  { ticker: 'RMD',  name: 'ResMed',                   sector: 'Healthcare',    sectorColor: '#a78bfa' },
  { ticker: 'COL',  name: 'Coles Group',              sector: 'Consumer',      sectorColor: '#22d48a' },
  { ticker: 'NCM',  name: 'Newmont',                  sector: 'Gold',          sectorColor: '#e8b84b' },
  { ticker: 'NST',  name: 'Northern Star',            sector: 'Gold',          sectorColor: '#e8b84b' },
  { ticker: 'REA',  name: 'REA Group',                sector: 'Tech',          sectorColor: '#a78bfa' },
  { ticker: 'XRO',  name: 'Xero',                     sector: 'Tech',          sectorColor: '#a78bfa' },
  { ticker: 'SEK',  name: 'Seek',                     sector: 'Tech',          sectorColor: '#a78bfa' },
  { ticker: 'ALX',  name: 'Atlas Arteria',            sector: 'Infrastructure',sectorColor: '#f97316' },
  { ticker: 'QBE',  name: 'QBE Insurance',            sector: 'Insurance',     sectorColor: '#5b8af5' },
  { ticker: 'SUN',  name: 'Suncorp Group',            sector: 'Insurance',     sectorColor: '#5b8af5' },
  { ticker: 'IAG',  name: 'Insurance Australia',      sector: 'Insurance',     sectorColor: '#5b8af5' },
  { ticker: 'AGL',  name: 'AGL Energy',               sector: 'Energy',        sectorColor: '#f97316' },
  { ticker: 'ORG',  name: 'Origin Energy',            sector: 'Energy',        sectorColor: '#f97316' },
  { ticker: 'AMP',  name: 'AMP Limited',              sector: 'Finance',       sectorColor: '#e8b84b' },
  { ticker: 'ASX',  name: 'ASX Limited',              sector: 'Exchange',      sectorColor: '#a78bfa' },
  // US majors often discussed
  { ticker: 'AAPL', name: 'Apple',                    sector: 'Tech',          sectorColor: '#a78bfa' },
  { ticker: 'MSFT', name: 'Microsoft',                sector: 'Tech',          sectorColor: '#5b8af5' },
  { ticker: 'NVDA', name: 'NVIDIA',                   sector: 'Tech',          sectorColor: '#22d48a' },
  { ticker: 'GOOGL',name: 'Alphabet',                 sector: 'Tech',          sectorColor: '#5b8af5' },
  { ticker: 'META', name: 'Meta Platforms',           sector: 'Tech',          sectorColor: '#5b8af5' },
  { ticker: 'TSLA', name: 'Tesla',                    sector: 'Automotive',    sectorColor: '#ff4f4f' },
  { ticker: 'AMZN', name: 'Amazon',                   sector: 'Tech',          sectorColor: '#f97316' },
  // Commodities & indices
  { ticker: 'GOLD', name: 'Gold Spot (XAU/USD)',      sector: 'Commodities',   sectorColor: '#e8b84b' },
  { ticker: 'OIL',  name: 'Crude Oil (WTI)',          sector: 'Commodities',   sectorColor: '#f97316' },
  { ticker: 'AUD',  name: 'AUD/USD',                  sector: 'FX',            sectorColor: '#22d48a' },
  { ticker: 'XJO',  name: 'ASX 200 Index',            sector: 'Index',         sectorColor: '#e8b84b' },
  { ticker: 'SPX',  name: 'S&P 500 Index',            sector: 'Index',         sectorColor: '#5b8af5' },
  { ticker: 'RBA',  name: 'Reserve Bank of Australia',sector: 'Monetary Policy', sectorColor: '#e8b84b' },
]

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()

  if (!q || q.length < 1) {
    return NextResponse.json({ stocks: [], articles: [], trending: getTrending() })
  }

  const lower = q.toLowerCase()
  const upper = q.toUpperCase()

  // ── Stock search (client-side filter on curated list) ──────────────────
  const stocks = ASX_STOCKS.filter(s =>
    s.ticker.startsWith(upper) ||
    s.name.toLowerCase().includes(lower) ||
    s.sector.toLowerCase().includes(lower)
  ).slice(0, 8)

  // ── Article search ──────────────────────────────────────────────────────
  let articles: {
    id: string
    title: string
    summary: string | null
    sector: string | null
    relatedTickers: string[]
    publishedAt: Date
    source: { name: string }
  }[] = []

  if (dbAvailable) {
    try {
      articles = await db.article.findMany({
        where: {
          summary: { not: null },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { relatedTickers: { has: upper } },
            { topicTags: { has: lower } },
            { sector: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: { source: { select: { name: true } } },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      })
    } catch { /* no articles if DB down */ }
  }

  return NextResponse.json({ stocks, articles, trending: null })
}

function getTrending() {
  return [
    { ticker: 'CBA',  name: 'Commonwealth Bank',  sector: 'Banking',    sectorColor: '#5b8af5' },
    { ticker: 'BHP',  name: 'BHP Group',           sector: 'Mining',     sectorColor: '#2ed494' },
    { ticker: 'XJO',  name: 'ASX 200',             sector: 'Index',      sectorColor: '#e8b84b' },
    { ticker: 'GOLD', name: 'Gold Spot',            sector: 'Commodities',sectorColor: '#e8b84b' },
    { ticker: 'RBA',  name: 'Reserve Bank',        sector: 'Macro',      sectorColor: '#e8b84b' },
    { ticker: 'NVDA', name: 'NVIDIA',               sector: 'Tech',       sectorColor: '#22d48a' },
  ]
}
