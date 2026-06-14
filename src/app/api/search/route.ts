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

// ─── Discover categories (ghost data — replaced with live feed when market data goes live) ───

export interface DiscoverStock {
  ticker: string
  name: string
  sector: string
  sectorColor: string
  change: number   // % change today
  price: number
  volume?: string  // e.g. "4.2M"
  note?: string    // e.g. "IPO Day 1", "52-week high"
}

export interface DiscoverCategory {
  id: string
  label: string
  icon: string   // emoji — rendered in UI
  stocks: DiscoverStock[]
  ghost: true    // flag so UI can show "simulated" badge
}

function getTrending(): DiscoverCategory[] {
  return [
    {
      id: 'gainers',
      label: 'Top Gainers',
      icon: '📈',
      ghost: true,
      stocks: [
        { ticker: 'PLS',  name: 'Pilbara Minerals',    sector: 'Lithium',    sectorColor: '#22d48a', change:  8.42, price: 3.18, volume: '28.4M' },
        { ticker: 'LTR',  name: 'Liontown Resources',  sector: 'Lithium',    sectorColor: '#22d48a', change:  6.91, price: 1.24, volume: '18.1M' },
        { ticker: 'MIN',  name: 'Mineral Resources',   sector: 'Mining',     sectorColor: '#2ed494', change:  5.83, price: 43.20, volume: '3.2M' },
        { ticker: 'NXT',  name: 'NextDC',              sector: 'Tech',       sectorColor: '#a78bfa', change:  5.21, price: 17.84, volume: '4.8M' },
        { ticker: 'WTC',  name: 'WiseTech Global',     sector: 'Tech',       sectorColor: '#a78bfa', change:  4.77, price: 98.40, volume: '1.1M' },
        { ticker: 'NST',  name: 'Northern Star',       sector: 'Gold',       sectorColor: '#e8b84b', change:  4.32, price: 16.22, volume: '6.9M' },
        { ticker: 'NEM',  name: 'Newmont',             sector: 'Gold',       sectorColor: '#e8b84b', change:  3.98, price: 82.14, volume: '2.3M' },
        { ticker: 'IEL',  name: 'IDP Education',       sector: 'Education',  sectorColor: '#a78bfa', change:  3.61, price: 14.55, volume: '2.7M' },
        { ticker: 'PME',  name: 'Pro Medicus',         sector: 'Healthtech', sectorColor: '#a78bfa', change:  3.44, price: 224.80, volume: '0.4M' },
        { ticker: 'ALQ',  name: 'ALS Limited',         sector: 'Testing',    sectorColor: '#2ed494', change:  3.12, price: 14.90, volume: '1.8M' },
      ],
    },
    {
      id: 'fallers',
      label: 'Top Fallers',
      icon: '📉',
      ghost: true,
      stocks: [
        { ticker: 'Z1P',  name: 'Zip Co',              sector: 'Fintech',    sectorColor: '#ff4f4f', change: -9.14, price: 1.38, volume: '42.1M' },
        { ticker: 'AGL',  name: 'AGL Energy',          sector: 'Energy',     sectorColor: '#f97316', change: -6.82, price: 9.74, volume: '8.3M' },
        { ticker: 'SGM',  name: 'Sims',                sector: 'Materials',  sectorColor: '#ff4f4f', change: -5.44, price: 11.20, volume: '2.1M' },
        { ticker: 'FLT',  name: 'Flight Centre',       sector: 'Travel',     sectorColor: '#ff4f4f', change: -4.91, price: 17.08, volume: '3.6M' },
        { ticker: 'IGO',  name: 'IGO Limited',         sector: 'Lithium',    sectorColor: '#ff4f4f', change: -4.63, price: 4.82, volume: '7.4M' },
        { ticker: 'BOE',  name: 'Boss Energy',         sector: 'Uranium',    sectorColor: '#f97316', change: -4.21, price: 2.94, volume: '5.8M' },
        { ticker: 'PDN',  name: 'Paladin Energy',      sector: 'Uranium',    sectorColor: '#f97316', change: -3.87, price: 8.14, volume: '9.2M' },
        { ticker: 'HVN',  name: 'Harvey Norman',       sector: 'Retail',     sectorColor: '#ff4f4f', change: -3.54, price: 4.38, volume: '4.4M' },
        { ticker: 'ORI',  name: 'Orica',               sector: 'Chemicals',  sectorColor: '#ff4f4f', change: -3.22, price: 17.95, volume: '1.9M' },
        { ticker: 'WHC',  name: 'Whitehaven Coal',     sector: 'Energy',     sectorColor: '#f97316', change: -2.98, price: 6.72, volume: '6.1M' },
      ],
    },
    {
      id: 'active',
      label: 'Most Active',
      icon: '⚡',
      ghost: true,
      stocks: [
        { ticker: 'CBA',  name: 'Commonwealth Bank',   sector: 'Banking',    sectorColor: '#5b8af5', change:  1.82, price: 162.40, volume: '3.8M' },
        { ticker: 'BHP',  name: 'BHP Group',           sector: 'Mining',     sectorColor: '#2ed494', change: -0.94, price: 44.82, volume: '12.4M' },
        { ticker: 'PLS',  name: 'Pilbara Minerals',    sector: 'Lithium',    sectorColor: '#22d48a', change:  8.42, price: 3.18,  volume: '28.4M' },
        { ticker: 'NAB',  name: 'Natl Australia Bank', sector: 'Banking',    sectorColor: '#5b8af5', change:  0.44, price: 38.92, volume: '6.2M' },
        { ticker: 'WBC',  name: 'Westpac',             sector: 'Banking',    sectorColor: '#5b8af5', change:  0.71, price: 29.18, volume: '5.9M' },
        { ticker: 'GOLD', name: 'Gold Spot',           sector: 'Commodities',sectorColor: '#e8b84b', change:  0.42, price: 3298.0, volume: '—' },
        { ticker: 'FMG',  name: 'Fortescue',           sector: 'Mining',     sectorColor: '#2ed494', change: -1.24, price: 18.34, volume: '9.1M' },
        { ticker: 'WDS',  name: 'Woodside Energy',     sector: 'Energy',     sectorColor: '#f97316', change:  2.81, price: 24.12, volume: '4.3M' },
      ],
    },
    {
      id: 'ipos',
      label: 'New IPOs',
      icon: '🆕',
      ghost: true,
      stocks: [
        { ticker: 'AIA',  name: 'AI Assets',           sector: 'Tech',       sectorColor: '#a78bfa', change:  12.40, price: 1.24, note: 'IPO Day 3',   volume: '14.2M' },
        { ticker: 'GCL',  name: 'Green Circle Energy', sector: 'Renewables', sectorColor: '#22d48a', change:   4.80, price: 2.08, note: 'IPO Week 1',  volume: '6.8M'  },
        { ticker: 'MNQ',  name: 'MineQuant',           sector: 'Mining Tech',sectorColor: '#2ed494', change:  -2.10, price: 0.94, note: 'IPO Week 2',  volume: '8.1M'  },
        { ticker: 'FDX',  name: 'Findexa',             sector: 'Fintech',    sectorColor: '#5b8af5', change:   7.25, price: 3.48, note: 'IPO Day 1',   volume: '22.4M' },
        { ticker: 'RGX',  name: 'RegulatAI',           sector: 'Regtech',    sectorColor: '#a78bfa', change:   1.60, price: 1.80, note: 'IPO Month 1', volume: '3.2M'  },
      ],
    },
    {
      id: 'interesting',
      label: 'Worth Watching',
      icon: '👁',
      ghost: true,
      stocks: [
        { ticker: 'CSL',  name: 'CSL Limited',         sector: 'Healthcare', sectorColor: '#a78bfa', change:  1.14, price: 298.40, note: '52-wk high', volume: '1.2M' },
        { ticker: 'XRO',  name: 'Xero',                sector: 'Tech',       sectorColor: '#a78bfa', change:  2.34, price: 142.80, note: 'Breakout',    volume: '0.8M' },
        { ticker: 'MQG',  name: 'Macquarie Group',     sector: 'Finance',    sectorColor: '#e8b84b', change: -0.88, price: 224.60, note: 'Earnings due', volume: '1.4M' },
        { ticker: 'REA',  name: 'REA Group',           sector: 'Proptech',   sectorColor: '#a78bfa', change:  1.92, price: 228.40, note: 'Analyst buy',  volume: '0.6M' },
        { ticker: 'GMG',  name: 'Goodman Group',       sector: 'Property',   sectorColor: '#a78bfa', change:  0.72, price: 38.84, note: 'Data centres', volume: '2.1M' },
        { ticker: 'NVDA', name: 'NVIDIA',              sector: 'Tech',       sectorColor: '#22d48a', change:  3.18, price: 131.40, note: 'AI demand',    volume: '—'    },
      ],
    },
  ]
}
